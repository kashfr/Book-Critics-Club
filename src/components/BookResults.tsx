'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Book, SearchResponse } from '@/types/books';
import Spinner from './Spinner';
import { ParallaxScroll } from './ui/parallax-scroll';
import Image from 'next/image';

interface BookResultsProps {
  query: string;
  initialPage: number;
}

interface ParallaxBook {
  imageUrl: string;
  bookId: string;
  title: string;
  query: string;
  currentPage: number;
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
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const router = useRouter();

  const fetchBooks = useCallback(
    async (page: number): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching books with query:', query, 'page:', page);
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}&page=${page}`
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data: SearchResponse = await res.json();
        console.log('API Response:', data);

        if (!data.items) {
          console.log('No items in response');
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
      <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center z-50">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-8 text-red-500">
        Error: {error}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="ml-4 px-2 py-1 bg-gray-200 rounded"
        >
          Toggle Debug Mode
        </button>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="w-full text-center py-8">
        No books found for "{query}"
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="ml-4 px-2 py-1 bg-gray-200 rounded"
        >
          Toggle Debug Mode
        </button>
      </div>
    );
  }

  // Transform books into the format needed for ParallaxScroll
  const bookImages: ParallaxBook[] = books
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
    .filter((book): book is ParallaxBook => book !== null);

  return (
    <div className="w-full mx-auto pt-8">
      <div className="text-center mb-4">
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Toggle Debug Mode
        </button>
      </div>

      {debugMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {books.map((book) => (
            <div key={book.id} className="border p-4 rounded">
              <h3 className="font-bold">{book.volumeInfo.title}</h3>
              {book.volumeInfo.imageLinks?.thumbnail && (
                <Image
                  src={book.volumeInfo.imageLinks.thumbnail}
                  alt={book.volumeInfo.title}
                  width={128}
                  height={192}
                  className="mx-auto my-2"
                />
              )}
              <p className="text-sm">
                {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <ParallaxScroll books={bookImages} className="mb-8" />
      )}

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
