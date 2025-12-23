'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedBook } from '@/types/savedBooks';
import { formatUSDate } from '@/utils/formatDate';
import Spinner from '@/components/Spinner';
import { Trash2, BookOpen } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchSavedBooks();
    }
  }, [user, authLoading, router]);

  const fetchSavedBooks = async () => {
    if (!user) return;
    
    try {
      const savedBooksRef = collection(db, 'users', user.uid, 'savedBooks');
      const q = query(savedBooksRef, orderBy('savedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const books: SavedBook[] = snapshot.docs.map((docSnap) => ({
        bookId: docSnap.id,
        ...docSnap.data(),
      })) as SavedBook[];
      
      setSavedBooks(books);
    } catch (error) {
      console.error('Error fetching library:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (!user) return;
    
    setRemovingId(bookId);
    try {
      const bookDocRef = doc(db, 'users', user.uid, 'savedBooks', bookId);
      await deleteDoc(bookDocRef);
      setSavedBooks((prev) => prev.filter((book) => book.bookId !== bookId));
    } catch (error) {
      console.error('Error removing book:', error);
    } finally {
      setRemovingId(null);
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
          My Library
        </h1>
        <p className="text-muted-foreground mt-2">
          Your collection of saved books.
        </p>
      </motion.div>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-8 flex justify-between items-center">
          <p>{error}</p>
          <button 
            onClick={() => { setError(null); setLoading(true); fetchSavedBooks(); }}
            className="text-xs font-bold underline px-2 py-1"
          >
            Retry
          </button>
        </div>
      )}

      {savedBooks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism rounded-3xl p-12 text-center border border-white/10"
        >
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your library is empty
          </h2>
          <p className="text-muted-foreground mb-6">
            Start adding books to your library from the book details page.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            Explore Books
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <AnimatePresence>
            {savedBooks.map((book, index) => (
              <motion.div
                key={book.bookId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  onClick={() => router.push(`/books/${book.bookId}`)}
                  className="cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                    {book.thumbnail ? (
                      <Image
                        src={book.thumbnail}
                        alt={book.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <BookOpen className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {book.authors?.join(', ') || 'Unknown Author'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Saved {formatUSDate(book.savedAt.split('T')[0])}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveBook(book.bookId)}
                  disabled={removingId === book.bookId}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title="Remove from library"
                >
                  {removingId === book.bookId ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
