'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/firebase/auth-context';

interface ExistingProposal {
  id: string;
  proposedChapters: number;
  reason: string;
  supportCount: number;
  opposeCount: number;
}

interface ProposeChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  currentChapters: number | null;
  onProposalSubmitted?: () => void;
}

export default function ProposeChangeModal({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  currentChapters,
  onProposalSubmitted,
}: ProposeChangeModalProps) {
  const { user } = useAuth();
  const [proposedChapters, setProposedChapters] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingProposal, setExistingProposal] = useState<ExistingProposal | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Check for existing proposal when modal opens
  useEffect(() => {
    async function checkExistingProposal() {
      if (!isOpen || !user || !bookId) return;
      
      setCheckingExisting(true);
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        
        const proposalsRef = collection(db, 'chapterProposals');
        const q = query(
          proposalsRef,
          where('bookId', '==', bookId),
          where('proposerId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setExistingProposal({
            id: doc.id,
            proposedChapters: data.proposedChapters,
            reason: data.reason,
            supportCount: data.supportCount || 0,
            opposeCount: data.opposeCount || 0,
          });
          // Pre-fill the form with existing values
          setProposedChapters(String(data.proposedChapters));
          setReason(data.reason);
        } else {
          setExistingProposal(null);
          setProposedChapters('');
          setReason('');
        }
      } catch (err) {
        console.error('Error checking existing proposal:', err);
      } finally {
        setCheckingExisting(false);
      }
    }

    checkExistingProposal();
  }, [isOpen, user, bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const chapters = parseInt(proposedChapters, 10);
    if (isNaN(chapters) || chapters < 1) {
      setError('Please enter a valid chapter count (1 or more)');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for your proposed change');
      return;
    }

    if (chapters === currentChapters) {
      setError('Proposed chapter count is the same as current');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { collection, doc, getDoc, addDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      if (existingProposal) {
        // UPDATE existing proposal
        const proposalRef = doc(db, 'chapterProposals', existingProposal.id);
        await updateDoc(proposalRef, {
          proposedChapters: chapters,
          reason: reason.trim(),
          updatedAt: new Date().toISOString(),
        });
        
        console.log('Proposal updated successfully:', existingProposal.id);
      } else {
        // CREATE new proposal
        const bookDetailsRef = doc(db, 'bookDetails', bookId);
        const bookDocSnap = await getDoc(bookDetailsRef);
        
        let originalContributorId = null;
        let originalContributorName = null;
        let currentChapterCount = 0;
        
        if (bookDocSnap.exists()) {
          const data = bookDocSnap.data();
          currentChapterCount = data.chapters || 0;
          originalContributorId = data.contributorId || null;
          originalContributorName = data.contributorName || null;
        }
        
        // Fetch the user's profile username from Firestore
        let proposerName = user.displayName || user.email || 'Anonymous';
        try {
          const userProfileRef = doc(db, 'users', user.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data();
            if (profileData.username) {
              proposerName = profileData.username;
            }
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Continue with fallback name
        }
        
        const proposalData = {
          bookId,
          bookTitle,
          proposedChapters: chapters,
          currentChapters: currentChapterCount,
          proposerId: user.uid,
          proposerName: proposerName,
          originalContributorId,
          originalContributorName,
          reason: reason.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
          votes: {},
          supportCount: 0,
          opposeCount: 0,
        };
        
        const proposalsRef = collection(db, 'chapterProposals');
        const docRef = await addDoc(proposalsRef, proposalData);
        
        console.log('Proposal created successfully:', docRef.id);

        // Create notification for original contributor
        if (originalContributorId && originalContributorId !== user.uid) {
          try {
            const notificationsRef = collection(db, 'users', originalContributorId, 'notifications');
            await addDoc(notificationsRef, {
              type: 'proposal_dispute',
              title: 'Your chapter count was disputed',
              message: `${user.displayName || user.email || 'Someone'} proposed changing the chapter count for "${bookTitle}" from ${currentChapterCount} to ${chapters}.`,
              relatedBookId: bookId,
              relatedProposalId: docRef.id,
              read: false,
              createdAt: new Date().toISOString(),
            });
          } catch (notifyError) {
            console.error('Failed to create notification:', notifyError);
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onProposalSubmitted?.();
        onClose();
        setProposedChapters('');
        setReason('');
        setSuccess(false);
        setExistingProposal(null);
      }, 1500);
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !existingProposal) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      const proposalRef = doc(db, 'chapterProposals', existingProposal.id);
      await deleteDoc(proposalRef);
      
      console.log('Proposal withdrawn:', existingProposal.id);
      
      onProposalSubmitted?.();
      onClose();
      setProposedChapters('');
      setReason('');
      setExistingProposal(null);
    } catch (err) {
      console.error('Error withdrawing proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw proposal');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`p-6 border-b border-white/10 ${
            existingProposal 
              ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10'
              : 'bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-amber-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold bg-clip-text text-transparent ${
                existingProposal
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400'
                  : 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400'
              }`}>
                {existingProposal ? 'Edit Your Proposal' : 'Propose Chapter Count Change'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {bookTitle}
            </p>
            {existingProposal && (
              <p className="text-xs text-amber-400 mt-2">
                You already have a pending proposal for this book
              </p>
            )}
          </div>

          {/* Loading state */}
          {checkingExisting && (
            <div className="p-6 flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* Form */}
          {!checkingExisting && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Current chapters info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-sm text-muted-foreground">Current chapter count:</span>
                <span className="font-bold text-lg">{currentChapters ?? '—'}</span>
              </div>

              {/* Existing proposal votes info */}
              {existingProposal && (existingProposal.supportCount > 0 || existingProposal.opposeCount > 0) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm text-muted-foreground">Current votes:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 text-sm">
                      ✓ {existingProposal.supportCount}
                    </span>
                    <span className="text-red-400 text-sm">
                      ✕ {existingProposal.opposeCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Proposed chapters input */}
              <div>
                <label htmlFor="proposedChapters" className="block text-xs font-semibold uppercase tracking-wider text-fuchsia-400 mb-2">
                  Your Proposed Count
                </label>
                <input
                  id="proposedChapters"
                  type="number"
                  min="1"
                  value={proposedChapters}
                  onChange={(e) => setProposedChapters(e.target.value)}
                  placeholder="Enter chapter count"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
                />
              </div>

              {/* Reason textarea */}
              <div>
                <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-fuchsia-400 mb-2">
                  Reason for Change
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you believe this is the correct chapter count..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all resize-none"
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {existingProposal ? 'Proposal updated successfully!' : 'Proposal submitted successfully!'}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="space-y-3">
                {/* Submit/Update button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting || isDeleting || success}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      {existingProposal ? 'Updating...' : 'Submitting...'}
                    </span>
                  ) : success ? (
                    existingProposal ? 'Updated!' : 'Submitted!'
                  ) : (
                    existingProposal ? 'Update Proposal' : 'Submit Proposal'
                  )}
                </motion.button>

                {/* Withdraw button (only shown for existing proposals) */}
                {existingProposal && (
                  <motion.button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isSubmitting || isDeleting || success}
                    className="w-full py-3 px-4 bg-white/5 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isDeleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full"
                        />
                        Withdrawing...
                      </span>
                    ) : (
                      'Withdraw Proposal'
                    )}
                  </motion.button>
                )}
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                {existingProposal 
                  ? 'Updating your proposal will keep existing votes.' 
                  : 'Your proposal will be visible to the community. The original contributor will be notified.'}
              </p>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
