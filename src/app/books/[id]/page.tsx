'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Book } from '@/types/books';
import EditableNumber from '@/components/EditableNumber';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from '@/components/Spinner';

function BookPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<number | null>(null);
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
    if (!book?.id) return;

    try {
      console.log('Updating chapters:', { bookId: book.id, chapters: value });

      const response = await fetch('/api/books/chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: book.id,
          chapters: value,
        }),
      });

      const data = await response.json();
      console.log('Update chapters response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update chapters');
      }

      setChapters(data.chapters);
    } catch (error) {
      console.error('Error updating chapters:', error);
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

        // Fetch chapters data
        console.log('Fetching chapters for:', bookId);
        const chaptersResponse = await fetch(
          `/api/books/chapters?bookId=${bookId}`
        );

        if (!chaptersResponse.ok) {
          console.error(
            'Failed to fetch chapters:',
            await chaptersResponse.text()
          );
        } else {
          const chaptersData = await chaptersResponse.json();
          console.log('Chapters data received:', chaptersData);
          setChapters(chaptersData.chapters);
        }
      } catch (error) {
        console.error('Error fetching book data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (!book) {
    return <div>Book not found</div>;
  }

  return (
    <div className="container mx-auto p-4 bg-white/90 rounded-lg shadow-lg">
      <button
        onClick={handleBack}
        className="inline-block mb-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        ← Back to Search Results
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">{book.volumeInfo.title}</h1>
          {book.volumeInfo.subtitle && (
            <h2 className="text-xl text-gray-600 mb-4">
              {book.volumeInfo.subtitle}
            </h2>
          )}

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {book.volumeInfo.imageLinks?.thumbnail && (
              <div className="relative">
                <Image
                  src={book.volumeInfo.imageLinks.thumbnail.replace(
                    'zoom=1',
                    'zoom=3'
                  )}
                  alt={book.volumeInfo.title}
                  width={300}
                  height={450}
                  style={{ width: 'auto', height: 'auto', maxHeight: '450px' }}
                  className="rounded-lg shadow-lg"
                  priority
                />
              </div>
            )}

            <div className="flex flex-col justify-start gap-4">
              {book.volumeInfo.pageCount && (
                <div>
                  <h3 className="text-lg font-semibold">Pages</h3>
                  <p className="text-xl">{book.volumeInfo.pageCount}</p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {chapters !== null && (
                  <motion.div
                    key="chapters"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      duration: 0.5,
                      bounce: 0.4,
                    }}
                    className="bg-blue-50 p-4 rounded-lg shadow-sm"
                  >
                    <h3 className="text-xl font-bold text-blue-900 mb-2">
                      Chapters
                    </h3>
                    <div className="text-2xl">
                      <EditableNumber
                        initialValue={chapters}
                        onSave={handleUpdateChapters}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {book.volumeInfo.previewLink && (
            <a
              href={book.volumeInfo.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-6 px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
            >
              Preview on Google Books
            </a>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            {book.volumeInfo.publisher && (
              <div>
                <h3 className="font-semibold">Publisher</h3>
                <p>{book.volumeInfo.publisher}</p>
              </div>
            )}
            {book.volumeInfo.publishedDate && (
              <div>
                <h3 className="font-semibold">Published Date</h3>
                <p>{book.volumeInfo.publishedDate}</p>
              </div>
            )}
          </div>

          {book.volumeInfo.categories && (
            <div className="mb-4">
              <h3 className="font-semibold">Categories</h3>
              <p>{book.volumeInfo.categories.join(', ')}</p>
            </div>
          )}

          {book.volumeInfo.averageRating && (
            <div>
              <h3 className="font-semibold">Rating</h3>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>
                      {i < Math.floor(book.volumeInfo.averageRating!)
                        ? '★'
                        : '☆'}
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">
                  ({book.volumeInfo.ratingsCount})
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Authors</h3>
            <p className="text-gray-600">
              {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
            </p>
          </div>

          {book.volumeInfo.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <div
                className="text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: book.volumeInfo.description,
                }}
              />
            </div>
          )}
        </div>
      </div>
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
