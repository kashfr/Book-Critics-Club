'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Book, SearchResponse } from '@/types/books';
import Spinner from './Spinner';
import { ParallaxScroll } from './ui/parallax-scroll';

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
  const router = useRouter();

  const fetchBooks = useCallback(
    async (page: number): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}&page=${page}`
        );
        const data: SearchResponse = await res.json();
        setBooks(data.items || []);
        setTotalPages(Math.ceil((data.totalItems || 0) / 40));
        setCurrentPage(page);

        router.push(`/?q=${encodeURIComponent(query)}&page=${page}`, {
          scroll: false,
        });
      } catch (error) {
        console.error('Error fetching books:', error);
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
      <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center z-50">
        <Spinner />
      </div>
    );
  }

  // Transform books into the format needed for ParallaxScroll
  const bookImages = books
    .map((book) => {
      if (!book.volumeInfo.imageLinks?.thumbnail) return null;
      return {
        imageUrl: book.volumeInfo.imageLinks.thumbnail.replace(
          'zoom=1',
          'zoom=2'
        ),
        bookId: book.id,
        title: book.volumeInfo.title,
        query: query,
        currentPage: currentPage,
      };
    })
    .filter(Boolean);

  return (
    <div className="w-full mx-auto pt-8">
      <ParallaxScroll books={bookImages} className="mb-8" />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => fetchBooks(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 border rounded-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchBooks(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-2 border rounded-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}