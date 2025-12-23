'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';

interface Proposal {
  id: string;
  proposedChapters: number;
  currentChapters: number;
  proposerId: string;
  proposerName: string;
  originalContributorId: string | null;
  reason: string;
  supportCount: number;
  opposeCount: number;
  votes?: Record<string, 'support' | 'oppose'>;
  createdAt: string;
}

interface PendingProposalBannerProps {
  bookId: string;
  bookTitle: string;
}

export default function PendingProposalBanner({ bookId, bookTitle }: PendingProposalBannerProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchPendingProposals() {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        
        const proposalsRef = collection(db, 'chapterProposals');
        const q = query(
          proposalsRef, 
          where('bookId', '==', bookId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        
        const fetchedProposals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Proposal));
        
        setProposals(fetchedProposals);
      } catch (error) {
        console.error('Error fetching pending proposals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingProposals();
  }, [bookId]);

  const handleVote = async (proposalId: string, voteType: 'support' | 'oppose') => {
    if (!user) return;
    
    setVotingId(proposalId);
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
      setVotingId(null);
    }
  };

  const getUserVote = (proposal: Proposal): 'support' | 'oppose' | null => {
    if (!user || !proposal.votes) return null;
    return proposal.votes[user.uid] || null;
  };

  // Don't render anything if loading or no proposals
  if (loading || proposals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-lg">⚠️</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-amber-400">
                {proposals.length} Active Proposal{proposals.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Community members are suggesting chapter count changes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {expanded ? 'Hide' : 'Show details'}
            </span>
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {proposals.map((proposal) => {
                  const userVote = getUserVote(proposal);
                  const isVoting = votingId === proposal.id;
                  const isOwnProposal = user?.uid === proposal.proposerId;
                  
                  return (
                    <div
                      key={proposal.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      {/* Proposal Info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className="text-lg font-bold text-red-400">{proposal.currentChapters}</p>
                          </div>
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Proposed</p>
                            <p className="text-lg font-bold text-emerald-400">{proposal.proposedChapters}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          by @{proposal.proposerName}
                        </div>
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-muted-foreground mb-3 italic">
                        "{proposal.reason}"
                      </p>

                      {/* Voting */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground mr-2">Vote:</span>
                        <button
                          onClick={() => handleVote(proposal.id, 'support')}
                          disabled={!user || isVoting || isOwnProposal}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            userVote === 'support'
                              ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                          } ${(!user || isOwnProposal) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {proposal.supportCount}
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, 'oppose')}
                          disabled={!user || isVoting || isOwnProposal}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            userVote === 'oppose'
                              ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-red-500/10 hover:border-red-500/30'
                          } ${(!user || isOwnProposal) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {proposal.opposeCount}
                        </button>
                        
                        {isOwnProposal && (
                          <span className="text-xs text-muted-foreground italic ml-2">
                            (Your proposal)
                          </span>
                        )}
                        {!user && (
                          <span className="text-xs text-muted-foreground italic ml-2">
                            Sign in to vote
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Link to full proposals page */}
                <Link
                  href="/proposals"
                  className="block text-center text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors py-2"
                >
                  View all proposals →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
