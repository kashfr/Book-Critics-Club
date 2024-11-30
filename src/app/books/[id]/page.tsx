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

  useEffect(() => {
    const fetchBookData = async () => {
      setLoading(true);
      try {
        const bookId = params.id as string;
        if (!bookId) return;

        const response = await fetch(`/api/books/details?id=${bookId}`);
        if (!response.ok) throw new Error('Failed to fetch book');

        const data: Book = await response.json();
        setBook(data);

        if (data.id) {
          const chaptersResponse = await fetch(
            `/api/books/chapters?bookId=${data.id}`
          );
          if (chaptersResponse.ok) {
            const chaptersData = await chaptersResponse.json();
            setChapters(chaptersData.chapters || 0);
          }
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
      <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center z-50">
        <Spinner />
      </div>
    );
  }

  if (!book) {
    return <div>Book not found</div>;
  }

  return (
    // Rest of your JSX for displaying book details
    <div className="container mx-auto px-4 py-8">
      {/* Your existing book display JSX */}
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
