'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import Spinner from '@/components/Spinner';
import { formatUSDate } from '@/utils/formatDate';

interface Proposal {
  id: string;
  bookId: string;
  bookTitle: string;
  proposedChapters: number;
  currentChapters: number;
  proposerId: string;
  proposerName: string;
  originalContributorId: string | null;
  originalContributorName: string | null;
  reason: string;
  status: string;
  createdAt: string;
  supportCount: number;
  opposeCount: number;
  votes?: Record<string, 'support' | 'oppose'>;
}

export default function ProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [actionProposalId, setActionProposalId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposals() {
      setLoading(true);
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        
        const proposalsRef = collection(db, 'chapterProposals');
        const q = query(proposalsRef, where('status', '==', filter));
        const snapshot = await getDocs(q);
        
        const fetchedProposals = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as Proposal))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        
        setProposals(fetchedProposals);
        console.log(`Fetched ${fetchedProposals.length} proposals with status: ${filter}`);
      } catch (error) {
        console.error('Error fetching proposals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, [filter]);

  // Handle community voting (support/oppose)
  const handleVote = async (proposalId: string, voteType: 'support' | 'oppose') => {
    if (!user) return;
    
    setVotingProposalId(proposalId);
    try {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      const proposalRef = doc(db, 'chapterProposals', proposalId);
      const proposalSnap = await getDoc(proposalRef);
      
      if (!proposalSnap.exists()) return;
      
      const data = proposalSnap.data();
      const votes = (data.votes || {}) as Record<string, 'support' | 'oppose'>;
      const previousVote = votes[user.uid];
      
      let supportCount = data.supportCount || 0;
      let opposeCount = data.opposeCount || 0;
      
      // Remove previous vote
      if (previousVote === 'support') supportCount = Math.max(0, supportCount - 1);
      else if (previousVote === 'oppose') opposeCount = Math.max(0, opposeCount - 1);
      
      // Toggle or add new vote
      if (previousVote === voteType) {
        delete votes[user.uid];
      } else {
        votes[user.uid] = voteType;
        if (voteType === 'support') supportCount++;
        else opposeCount++;
      }
      
      await updateDoc(proposalRef, { votes, supportCount, opposeCount });
      
      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === proposalId 
          ? { ...p, votes, supportCount, opposeCount }
          : p
      ));
    } catch (error) {
      console.error('Error voting on proposal:', error);
    } finally {
      setVotingProposalId(null);
    }
  };

  // Handle approval/rejection by original contributor
  const handleApproval = async (proposal: Proposal, action: 'approved' | 'rejected') => {
    if (!user) return;
    
    setActionProposalId(proposal.id);
    try {
      const { doc, updateDoc, setDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      const proposalRef = doc(db, 'chapterProposals', proposal.id);
      
      // Update proposal status
      await updateDoc(proposalRef, { 
        status: action,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.uid,
      });
      
      // If approved, update the book's chapter count with contributor chain
      if (action === 'approved') {
        const bookDetailsRef = doc(db, 'bookDetails', proposal.bookId);
        
        // Get current contributor info to preserve original owner
        const bookDocSnap = await getDoc(bookDetailsRef);
        
        // proposal.proposerName should already be the correct username from Firestore (fixed in previous steps)
        let contributorName = proposal.proposerName;
        let originalContributorId = proposal.proposerId; // Default to proposer if no existing data
        
        if (bookDocSnap.exists()) {
          const currentData = bookDocSnap.data();
          const existingContributorName = currentData.contributorName || '';
          const existingContributorId = currentData.contributorId || '';
          
          // PRESERVE the original contributor ID - they should always have edit rights
          if (existingContributorId) {
            originalContributorId = existingContributorId;
          }
          
          // Append the proposer name to the contributor chain with "&"
          // Only append if the proposer is different from existing contributors
          if (existingContributorName && !existingContributorName.includes(proposal.proposerName)) {
            contributorName = `${existingContributorName} & ${proposal.proposerName}`;
          } else if (existingContributorName) {
            // Keep existing contributor name if proposer is already in the chain
            contributorName = existingContributorName;
          }
        }
        
        const { arrayUnion } = await import('firebase/firestore');
        await setDoc(bookDetailsRef, {
          chapters: proposal.proposedChapters,
          contributorId: originalContributorId, // Keep original owner's ID for edit rights
          contributorName: contributorName, // Update display name chain
          contributorIds: arrayUnion(originalContributorId, proposal.proposerId), // Add both to be safe
          contributedAt: new Date().toISOString(),
          upvotes: 0,
          downvotes: 0,
          voters: {},
        }, { merge: true });
      }

      // Create notification for the proposer
      const { collection, addDoc } = await import('firebase/firestore');
      const notificationsRef = collection(db, 'users', proposal.proposerId, 'notifications');
      
      await addDoc(notificationsRef, {
        type: action === 'approved' ? 'proposal_accepted' : 'proposal_rejected',
        title: action === 'approved' ? 'Proposal Accepted! 🎉' : 'Proposal Rejected',
        message: action === 'approved' 
          ? `Your proposal for "${proposal.bookTitle}" has been accepted!` 
          : `Your proposal for "${proposal.bookTitle}" was not accepted.`,
        relatedBookId: proposal.bookId,
        relatedProposalId: proposal.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
      
      // Remove from local state (it will now be in a different tab)
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      
      console.log(`Proposal ${action}:`, proposal.id);
    } catch (error) {
      console.error('Error updating proposal status:', error);
    } finally {
      setActionProposalId(null);
    }
  };

  // Check if user has voted on a proposal
  const getUserVote = (proposal: Proposal): 'support' | 'oppose' | null => {
    if (!user || !proposal.votes) return null;
    return proposal.votes[user.uid] || null;
  };

  // Check if user can approve/reject
  const canApproveReject = (proposal: Proposal): boolean => {
    if (!user) return false;
    return proposal.originalContributorId === user.uid;
  };

  // Check if user is the proposer
  const isOwnProposal = (proposal: Proposal): boolean => {
    if (!user) return false;
    return proposal.proposerId === user.uid;
  };

  // State for deleting
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);

  // Handle withdrawal by proposer
  const handleWithdraw = async (proposalId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to withdraw this proposal? This action cannot be undone.')) {
      return;
    }
    
    setDeletingProposalId(proposalId);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      const proposalRef = doc(db, 'chapterProposals', proposalId);
      await deleteDoc(proposalRef);
      
      // Remove from local state
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      
      console.log('Proposal withdrawn:', proposalId);
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
    } finally {
      setDeletingProposalId(null);
    }
  };

  // State for editing proposal inline
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editChapters, setEditChapters] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Open edit modal
  const handleStartEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setEditChapters(String(proposal.proposedChapters));
    setEditReason(proposal.reason);
    setEditError(null);
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!user || !editingProposal) return;

    const chapters = parseInt(editChapters, 10);
    if (isNaN(chapters) || chapters < 1) {
      setEditError('Please enter a valid chapter count (1 or more)');
      return;
    }

    if (!editReason.trim()) {
      setEditError('Please provide a reason for your proposed change');
      return;
    }

    if (chapters === editingProposal.currentChapters) {
      setEditError('Proposed chapter count is the same as current');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');

      const proposalRef = doc(db, 'chapterProposals', editingProposal.id);
      await updateDoc(proposalRef, {
        proposedChapters: chapters,
        reason: editReason.trim(),
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === editingProposal.id 
          ? { ...p, proposedChapters: chapters, reason: editReason.trim() }
          : p
      ));

      console.log('Proposal updated:', editingProposal.id);
      setEditingProposal(null);
    } catch (error) {
      console.error('Error updating proposal:', error);
      setEditError('Failed to update proposal');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 via-violet-400 to-amber-400 bg-clip-text text-transparent mb-2">
            Chapter Count Proposals
          </h1>
          <p className="text-muted-foreground">
            Community-submitted corrections to book chapter counts
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                filter === status
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                  : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {/* Empty state */}
        {!loading && proposals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">No {filter} proposals</h2>
            <p className="text-muted-foreground">
              {filter === 'pending'
                ? 'All chapter counts are looking accurate!'
                : `No proposals have been ${filter} yet.`}
            </p>
          </motion.div>
        )}

        {/* Proposals list */}
        {!loading && proposals.length > 0 && (
          <div className="space-y-4">
            {proposals.map((proposal, index) => {
              const userVote = getUserVote(proposal);
              const canAction = canApproveReject(proposal);
              const isVoting = votingProposalId === proposal.id;
              const isActioning = actionProposalId === proposal.id;
              
              return (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6"
                >
                  {/* Book title */}
                  <Link href={`/books/${proposal.bookId}`}>
                    <h3 className="text-lg font-bold text-foreground hover:text-fuchsia-400 transition-colors mb-2">
                      {proposal.bookTitle}
                    </h3>
                  </Link>

                  {/* Proposal details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Current</span>
                      <p className="text-2xl font-bold text-red-400">{proposal.currentChapters} chapters</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Proposed</span>
                      <p className="text-2xl font-bold text-emerald-400">{proposal.proposedChapters} chapters</p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Reason</span>
                    <p className="text-sm text-foreground mt-1">{proposal.reason}</p>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Proposed by <span className="text-fuchsia-400">@{proposal.proposerName}</span>
                      {proposal.originalContributorName && (
                        <span>
                          {' '}• Disputes <span className="text-amber-400">@{proposal.originalContributorName}</span>
                        </span>
                      )}
                    </div>
                    <div>{formatUSDate(proposal.createdAt)}</div>
                  </div>

                  {/* Voting and Action Section */}
                  {filter === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      {/* Community Voting */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Community Vote:</span>
                        <button
                          onClick={() => handleVote(proposal.id, 'support')}
                          disabled={!user || isVoting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            userVote === 'support'
                              ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Support ({proposal.supportCount})
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, 'oppose')}
                          disabled={!user || isVoting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            userVote === 'oppose'
                              ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-red-500/10 hover:border-red-500/30'
                          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Oppose ({proposal.opposeCount})
                        </button>
                        {!user && (
                          <span className="text-xs text-muted-foreground italic">Sign in to vote</span>
                        )}
                      </div>

                      {/* Original Contributor Actions */}
                      {canAction && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <span className="text-xs text-amber-400 font-medium">As the original contributor, you can:</span>
                          <button
                            onClick={() => handleApproval(proposal, 'approved')}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
                          >
                            {isActioning ? 'Processing...' : '✓ Approve Change'}
                          </button>
                          <button
                            onClick={() => handleApproval(proposal, 'rejected')}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-50"
                          >
                            {isActioning ? 'Processing...' : '✕ Reject'}
                          </button>
                        </div>
                      )}

                      {/* Proposer Actions (Edit/Withdraw) */}
                      {isOwnProposal(proposal) && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
                          <span className="text-xs text-violet-400 font-medium">Your proposal:</span>
                          <button
                            onClick={() => handleStartEdit(proposal)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-500 transition-all"
                          >
                            ✎ Edit Proposal
                          </button>
                          <button
                            onClick={() => handleWithdraw(proposal.id)}
                            disabled={deletingProposalId === proposal.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white/5 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          >
                            {deletingProposalId === proposal.id ? 'Withdrawing...' : '✕ Withdraw'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status badge for approved/rejected */}
                  {filter !== 'pending' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        filter === 'approved' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      }`}>
                        {filter === 'approved' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-fuchsia-400 transition-colors"
          >
            ← Back to search
          </Link>
        </motion.div>
      </div>

      {/* Edit Proposal Modal */}
      <AnimatePresence>
        {editingProposal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setEditingProposal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-amber-500/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                    Edit Your Proposal
                  </h2>
                  <button
                    onClick={() => setEditingProposal(null)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {editingProposal.bookTitle}
                </p>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Current chapters info */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm text-muted-foreground">Current chapter count:</span>
                  <span className="font-bold text-lg">{editingProposal.currentChapters}</span>
                </div>

                {/* Proposed chapters input */}
                <div>
                  <label htmlFor="editChapters" className="block text-xs font-semibold uppercase tracking-wider text-fuchsia-400 mb-2">
                    Your Proposed Count
                  </label>
                  <input
                    id="editChapters"
                    type="number"
                    min="1"
                    value={editChapters}
                    onChange={(e) => setEditChapters(e.target.value)}
                    placeholder="Enter chapter count"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
                  />
                </div>

                {/* Reason textarea */}
                <div>
                  <label htmlFor="editReason" className="block text-xs font-semibold uppercase tracking-wider text-fuchsia-400 mb-2">
                    Reason for Change
                  </label>
                  <textarea
                    id="editReason"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Explain why you believe this is the correct chapter count..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all resize-none"
                  />
                </div>

                {/* Error message */}
                {editError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {editError}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleEditSubmit}
                    disabled={isUpdating}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isUpdating ? 'Updating...' : 'Update Proposal'}
                  </button>
                  <button
                    onClick={() => setEditingProposal(null)}
                    disabled={isUpdating}
                    className="px-6 py-3 bg-white/5 border border-white/10 text-muted-foreground font-semibold rounded-xl hover:bg-white/10 disabled:opacity-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground">
                  Updating your proposal will keep any existing votes.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
