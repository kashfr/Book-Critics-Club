'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { useAuth } from '@/lib/firebase/auth-context';
import ProposeChangeModal from './ProposeChangeModal';

interface ChapterCountBadgeProps {
  chapters: number | null;
  contributorId?: string | null;
  contributorName?: string | null;
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;
  bookId: string;
  bookTitle?: string;
  onSave: (value: number) => Promise<void>;
  onVote?: (vote: 'up' | 'down') => Promise<void>;
}

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const motionValue = useMotionValue(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <span>{displayValue}</span>;
}

export default function ChapterCountBadge({ 
  chapters, 
  contributorId,
  contributorName,
  upvotes: initialUpvotes = 0,
  downvotes: initialDownvotes = 0,
  userVote: initialUserVote = null,
  bookId,
  bookTitle,
  onSave,
  onVote 
}: ChapterCountBadgeProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Voting state
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentUserVote, setCurrentUserVote] = useState<'up' | 'down' | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Check if current user is the original contributor (can directly edit)
  const isOriginalContributor = user && contributorId && user.uid === contributorId;
  // Can directly edit if: no chapters set yet, or user is the original contributor
  const canDirectlyEdit = chapters === null || chapters === 0 || isOriginalContributor;

  useEffect(() => {
    if (chapters !== null) {
      setInputValue(String(chapters));
    }
  }, [chapters]);

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
    setCurrentUserVote(initialUserVote);
  }, [initialUpvotes, initialDownvotes, initialUserVote]);

  const handleSave = async () => {
    const newValue = parseInt(inputValue, 10);
    if (isNaN(newValue) || newValue < 0) return;

    setIsSaving(true);
    setShowError(false);
    try {
      await onSave(newValue);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving chapters:', error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVote = async (vote: 'up' | 'down') => {
    if (!user || isVoting) return;

    setIsVoting(true);
    try {
      // Import Firestore functions for client-side write
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      // Get current book details
      const bookDetailsRef = doc(db, 'bookDetails', bookId);
      const docSnap = await getDoc(bookDetailsRef);
      
      if (!docSnap.exists()) {
        console.error('Book details not found');
        return;
      }
      
      const data = docSnap.data();
      const voters = (data.voters || {}) as Record<string, string>;
      const previousVote = voters[user.uid];
      
      // Calculate new vote counts
      let newUpvotes = typeof data.upvotes === 'number' ? data.upvotes : 0;
      let newDownvotes = typeof data.downvotes === 'number' ? data.downvotes : 0;
      
      // Remove previous vote if exists
      if (previousVote === 'up') {
        newUpvotes = Math.max(0, newUpvotes - 1);
      } else if (previousVote === 'down') {
        newDownvotes = Math.max(0, newDownvotes - 1);
      }
      
      // If clicking the same vote, toggle it off
      let newUserVote: 'up' | 'down' | null;
      if (previousVote === vote) {
        delete voters[user.uid];
        newUserVote = null;
      } else {
        // Add new vote
        voters[user.uid] = vote;
        if (vote === 'up') {
          newUpvotes++;
        } else {
          newDownvotes++;
        }
        newUserVote = vote;
      }
      
      // Update Firestore directly from client (has user's auth context)
      await updateDoc(bookDetailsRef, {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        voters,
      });
      
      // Update local state
      setUpvotes(newUpvotes);
      setDownvotes(newDownvotes);
      setCurrentUserVote(newUserVote);
      
      console.log('Vote recorded successfully:', { newUpvotes, newDownvotes, newUserVote });
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(String(chapters ?? 0));
    }
  };

  // Trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
      className="relative group"
    >
      {/* Ambient glow effect */}
      <motion.div
        className="absolute -inset-2 bg-gradient-to-r from-violet-600/30 via-fuchsia-500/30 to-amber-500/30 rounded-3xl blur-xl"
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl">
        {/* Shimmer effect overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-fuchsia-400/60"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -15, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative p-6">
          {/* Header with book icon */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="relative"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Book stack icon */}
              <svg
                className="w-8 h-8 text-fuchsia-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </svg>
              {/* Glow behind icon */}
              <motion.div
                className="absolute inset-0 bg-fuchsia-500/50 blur-lg"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <div>
              <motion.h3
                className="text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-fuchsia-400 via-violet-400 to-amber-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: '200% 200%' }}
              >
                Total Chapters
              </motion.h3>
              {contributorName && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  by @{contributorName}
                </p>
              )}
              {!contributorName && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Community Contributed
                </p>
              )}
            </div>
          </div>

          {/* Chapter count display */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3"
              >
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  min="0"
                  autoFocus
                  className="w-24 px-4 py-3 text-3xl font-black bg-white/10 border border-white/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
                />
                {isSaving && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <motion.div
                    className="text-5xl font-black bg-gradient-to-br from-white via-fuchsia-200 to-violet-300 bg-clip-text text-transparent"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {hasAnimated && chapters !== null ? (
                      <AnimatedCounter value={chapters} />
                    ) : (
                      chapters ?? '—'
                    )}
                  </motion.div>

                  {user ? (
                    canDirectlyEdit ? (
                      // Original contributor or no chapters set - can directly edit
                      <motion.button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-fuchsia-500/30 transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </motion.button>
                    ) : (
                      // Other users - must submit proposal
                      <motion.button
                        onClick={() => setShowProposeModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full hover:bg-amber-500/20 hover:border-amber-500/50 transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Suggest Edit
                      </motion.button>
                    )
                  ) : (
                    <div className="text-[10px] text-muted-foreground text-right max-w-[100px]">
                      Sign in to contribute
                    </div>
                  )}
                </div>

                {/* Voting section */}
                {chapters !== null && chapters > 0 && (
                  <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Is this accurate?
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Thumbs up */}
                      <motion.button
                        onClick={() => handleVote('up')}
                        disabled={!user || isVoting}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                          currentUserVote === 'up'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={user ? { scale: 1.05 } : {}}
                        whileTap={user ? { scale: 0.95 } : {}}
                      >
                        <svg className="w-4 h-4" fill={currentUserVote === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{upvotes}</span>
                      </motion.button>

                      {/* Thumbs down */}
                      <motion.button
                        onClick={() => handleVote('down')}
                        disabled={!user || isVoting}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                          currentUserVote === 'down'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={user ? { scale: 1.05 } : {}}
                        whileTap={user ? { scale: 0.95 } : {}}
                      >
                        <svg className="w-4 h-4" fill={currentUserVote === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                        <span>{downvotes}</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success/Error indicator */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-emerald-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </motion.div>
            )}
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-red-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Failed to save
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Propose Change Modal */}
      <ProposeChangeModal
        isOpen={showProposeModal}
        onClose={() => setShowProposeModal(false)}
        bookId={bookId}
        bookTitle={bookTitle || 'Book'}
        currentChapters={chapters}
        onProposalSubmitted={() => {
          console.log('Proposal submitted for:', bookId);
        }}
      />
    </motion.div>
  );
}
