import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Book, SearchResponse } from '@/types/books';
import Spinner from './Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SaveBookButton from './SaveBookButton';
import BookCover from './BookCover';

interface BookResultsProps {
  query: string;
  initialPage: number;
}

export default function BookResults({
  query,
  initialPage,
}: BookResultsProps): JSX.Element {
  const [books, setBooks] = useState<Book[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchBooks = useCallback(
    async (page: number): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}&page=${page}`
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data: SearchResponse = await res.json();

        if (!data.items) {
          setBooks([]);
          setTotalPages(0);
        } else {
          setBooks(data.items);
          setTotalPages(Math.ceil((data.totalItems || 0) / 40));
        }
        setCurrentPage(page);

        router.push(`/?q=${encodeURIComponent(query)}&page=${page}`, {
          scroll: false,
        });
      } catch (error) {
        console.error('Error fetching books:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch books'
        );
        setBooks([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [query, router]
  );

  useEffect(() => {
    fetchBooks(initialPage);
  }, [fetchBooks, initialPage, query]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center z-50 bg-background/50 backdrop-blur-sm">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-20 text-destructive font-medium">
        Error: {error}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="w-full text-center py-20 text-muted-foreground">
        No books found for &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        <AnimatePresence mode="popLayout">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="group relative"
            >
              <Link
                href={`/books/${book.id}?returnQuery=${encodeURIComponent(
                  query
                )}&returnPage=${currentPage}`}
                className="cursor-pointer block"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <BookCover
                    googleThumbnail={book.volumeInfo.imageLinks?.thumbnail}
                    title={book.volumeInfo.title}
                    author={book.volumeInfo.authors?.[0]}
                    alt={book.volumeInfo.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {book.volumeInfo.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                  </p>
                </div>
              </Link>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                <SaveBookButton book={book} variant="default" size="sm" showText={false} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-16 pt-8 border-t border-border">
          <button
            onClick={() => fetchBooks(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-6 py-2 glass-morphism rounded-full disabled:opacity-50 hover:bg-white/5 transition-colors font-medium text-sm"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            Page <span className="text-foreground">{currentPage}</span> of {totalPages}
          </span>
          <button
            onClick={() => fetchBooks(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-6 py-2 glass-morphism rounded-full disabled:opacity-50 hover:bg-white/5 transition-colors font-medium text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
