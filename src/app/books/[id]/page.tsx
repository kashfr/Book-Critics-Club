'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Book } from '@/types/books';
import ChapterCountBadge from '@/components/ChapterCountBadge';
import PendingProposalBanner from '@/components/PendingProposalBanner';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from '@/components/Spinner';
import { formatUSDate } from '@/utils/formatDate';
import SaveBookButton from '@/components/SaveBookButton';

interface ChapterDetails {
  chapters: number;
  contributorId?: string;
  contributorName?: string;
  contributedAt?: string;
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;
}

function BookPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<number | null>(null);
  const [chapterDetails, setChapterDetails] = useState<ChapterDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    const returnQuery = searchParams.get('returnQuery');
    const returnPage = searchParams.get('returnPage');
    if (returnQuery) {
      router.push(
        `/?q=${encodeURIComponent(returnQuery)}${
          returnPage ? `&page=${returnPage}` : ''
        }`
      );
    } else {
      router.push('/');
    }
  };

  const handleUpdateChapters = async (value: number) => {
    if (!book?.id || !user) return;

    try {
      console.log('Updating chapters:', { bookId: book.id, chapters: value });

      // Fetch latest username from Firestore users collection first
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let contributorName = user.displayName || user.email || 'Anonymous';
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.username) {
          contributorName = userData.username;
        }
      }

      // Write directly to Firestore using client SDK
      const { arrayUnion } = await import('firebase/firestore');
      const bookDetailsRef = doc(db, 'bookDetails', book.id);
      await setDoc(bookDetailsRef, { 
        chapters: value,
        contributorId: user.uid,
        contributorName: contributorName,
        contributorIds: arrayUnion(user.uid),
        contributedAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        voters: {},
      }, { merge: true });
      
      console.log('Chapters updated successfully');
      setChapters(value);
      // Trigger a refresh to update contributor info in the badge
      setChapterDetails({
        chapters: value,
        contributorId: user.uid,
        contributorName: contributorName,
        upvotes: 0,
        downvotes: 0,
      });
    } catch (error) {
      console.error('Error updating chapters:', error);
      throw error; // Re-throw so the component can handle it
    }
  };


  useEffect(() => {
    const fetchBookData = async () => {
      setLoading(true);
      try {
        const bookId = params.id as string;
        if (!bookId) return;

        console.log('Fetching book data for:', bookId);


        // Fetch book details
        const response = await fetch(`/api/books/details?id=${bookId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch book');
        }

        const bookData = await response.json();
        console.log('Book data received:', bookData);
        setBook(bookData);

        // Fetch chapters data with full details
        console.log('Fetching chapters for:', bookId);
        const chaptersUrl = user 
          ? `/api/books/chapters?bookId=${bookId}&userId=${user.uid}`
          : `/api/books/chapters?bookId=${bookId}`;
        const chaptersResponse = await fetch(chaptersUrl);

        if (!chaptersResponse.ok) {
          console.error(
            'Failed to fetch chapters:',
            await chaptersResponse.text()
          );
        } else {
          const chaptersData = await chaptersResponse.json();
          console.log('Chapters data received:', chaptersData);
          setChapters(chaptersData.chapters);
          setChapterDetails({
            chapters: chaptersData.chapters,
            contributorId: chaptersData.contributorId,
            contributorName: chaptersData.contributorName,
            contributedAt: chaptersData.contributedAt,
            upvotes: chaptersData.upvotes || 0,
            downvotes: chaptersData.downvotes || 0,
            userVote: chaptersData.userVote || null,
          });
        }
      } catch (error) {
        console.error('Error fetching book data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [params.id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-destructive mb-4">Book not found</h2>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 glass-morphism rounded-full hover:bg-white/5 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 relative z-10">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="mb-8 px-6 py-2 glass-morphism rounded-full hover:bg-white/5 transition-colors flex items-center gap-2 group text-sm font-medium"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        Back to Results
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphism rounded-3xl p-8 md:p-12 border border-white/10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column: Image and Status */}
          <div className="space-y-8">
            <div className="relative aspect-[2/3] w-full max-w-[350px] mx-auto group">
              <div className="absolute inset-0 bg-primary/20 blur-3xl group-hover:bg-primary/30 transition-colors -z-10" />
              {book.volumeInfo.imageLinks?.thumbnail && (
                <Image
                  src={book.volumeInfo.imageLinks.thumbnail.replace(
                    'zoom=1',
                    'zoom=3'
                  )}
                  alt={book.volumeInfo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="rounded-2xl shadow-2xl object-cover"
                  priority
                />
              )}
            </div>

            <div className="space-y-4">
              {book.volumeInfo.previewLink && (
                <a
                  href={book.volumeInfo.previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Preview on Google Books ↗
                </a>
              )}

              {user && (
                <SaveBookButton 
                  book={book} 
                  variant="outline" 
                  size="lg" 
                  fullWidth 
                  className="font-bold"
                />
              )}
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-foreground leading-tight">
              {book.volumeInfo.title}
            </h1>
            {book.volumeInfo.subtitle && (
              <h2 className="text-xl md:text-2xl font-medium text-muted-foreground mb-6">
                {book.volumeInfo.subtitle}
              </h2>
            )}

            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Authors</h3>
              <p className="text-lg font-medium text-foreground">
                {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
              </p>
            </div>

            {/* Pending Proposals Banner */}
            <PendingProposalBanner 
              bookId={book.id} 
              bookTitle={book.volumeInfo.title} 
            />

            {/* Chapter Count Badge - Community Contributed */}
            <div className="mb-8">
              <ChapterCountBadge 
                chapters={chapters}
                contributorId={chapterDetails?.contributorId}
                contributorName={chapterDetails?.contributorName}
                upvotes={chapterDetails?.upvotes || 0}
                downvotes={chapterDetails?.downvotes || 0}
                userVote={chapterDetails?.userVote}
                bookId={book.id}
                bookTitle={book.volumeInfo.title}
                onSave={handleUpdateChapters}
              />
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              {book.volumeInfo.pageCount && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Length</h3>
                  <p className="text-lg font-bold">{book.volumeInfo.pageCount} pages</p>
                </div>
              )}
              {book.volumeInfo.averageRating && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Rating</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-yellow-500">
                      {'★'.repeat(Math.round(book.volumeInfo.averageRating))}
                    </span>
                    <span className="text-xs text-muted-foreground">({book.volumeInfo.ratingsCount})</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Description</h3>
                <div
                  className="text-muted-foreground prose prose-invert prose-sm max-w-none line-clamp-[12] md:line-clamp-none overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html: book.volumeInfo.description || 'No description available.',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto pt-8 border-t border-white/5">
                {book.volumeInfo.publisher && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Publisher</h3>
                    <p className="text-sm font-medium">{book.volumeInfo.publisher}</p>
                  </div>
                )}
                {book.volumeInfo.publishedDate && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Published</h3>
                    <p className="text-sm font-medium">{formatUSDate(book.volumeInfo.publishedDate)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BookPage(): JSX.Element {
  return (
    <Suspense fallback={<Spinner />}>
      <BookPageContent />
    </Suspense>
  );
}
