'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUSDate } from '@/utils/formatDate';
import Spinner from '@/components/Spinner';
import { BookOpen, Edit3, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Contribution {
  bookId: string;
  chapters: number;
  contributedAt: string;
  upvotes: number;
  downvotes: number;
  bookTitle?: string;
  bookThumbnail?: string;
  bookAuthors?: string[];
}

export default function ContributionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchContributions();
    }
  }, [user, authLoading, router]);

  const fetchContributions = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/contributions', {
        headers: {
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || 'Failed to fetch contributions');
          } catch (e) {
            if (text.trim().startsWith('<')) {
            // If server returns HTML (likely 500 crash), assume no contributions/offline
            // and don't show error to user.
            setContributions([]);
            return;
          }
          throw e;
        }
      }

      const data = await response.json();
      const contributionsWithDetails = await Promise.all(
        data.contributions.map(async (contrib: Contribution) => {
          try {
            // Fetch book details from Google Books API
            const bookResponse = await fetch(`/api/books/details?id=${contrib.bookId}`);
            if (bookResponse.ok) {
              const bookData = await bookResponse.json();
              return {
                ...contrib,
                bookTitle: bookData.volumeInfo?.title || 'Unknown Title',
                bookThumbnail: bookData.volumeInfo?.imageLinks?.thumbnail || null,
                bookAuthors: bookData.volumeInfo?.authors || [],
              };
            }
          } catch (e) {
            console.error('Error fetching book details:', e);
          }
          return {
            ...contrib,
            bookTitle: 'Unknown Title',
            bookThumbnail: null,
            bookAuthors: [],
          };
        })
      );
      
      setContributions(contributionsWithDetails);
    } catch (error) {
      console.error('Error fetching contributions:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
          My Contributions
        </h1>
        <p className="text-muted-foreground mt-2">
          Books where you&apos;ve contributed chapter counts.
        </p>
      </motion.div>
      
      {error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism rounded-3xl p-12 text-center border border-destructive/20"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't load your contributions. Please try again."}
          </p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchContributions(); }}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            Try Again
          </button>
        </motion.div>
      ) : contributions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism rounded-3xl p-12 text-center border border-white/10"
        >
          <Edit3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No contributions yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start contributing by adding chapter counts to books.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            Explore Books
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {contributions.map((contrib, index) => (
              <motion.div
                key={contrib.bookId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/books/${contrib.bookId}`)}
                className="group cursor-pointer glass-morphism rounded-2xl p-4 border border-white/10 hover:border-primary/50 transition-all"
              >
                <div className="flex gap-4">
                  {/* Book cover */}
                  <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                    {contrib.bookThumbnail ? (
                      <Image
                        src={contrib.bookThumbnail}
                        alt={contrib.bookTitle || 'Book cover'}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Book info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {contrib.bookTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {contrib.bookAuthors?.join(', ') || 'Unknown Author'}
                    </p>

                    {/* Chapter badge */}
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/20 rounded-full">
                      <span className="text-sm font-bold text-fuchsia-400">
                        {contrib.chapters} chapters
                      </span>
                    </div>

                    {/* Votes */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {contrib.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        {contrib.downvotes}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                      Contributed {formatUSDate(contrib.contributedAt?.split('T')[0])}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
