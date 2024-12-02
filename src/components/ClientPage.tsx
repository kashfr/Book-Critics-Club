'use client';

import { useSession } from 'next-auth/react';
import Footer from '@/components/Footer';
import BookResults from '@/components/BookResults';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import BookSearchBar from '@/components/BookSearchBar';
import Image from 'next/image';
import SearchParamsProvider, {
  useSearchParamsContext,
} from './SearchParamsProvider';
import { Suspense } from 'react';

const words = `Welcome, bookworm! Please sign in.`;

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

function SearchContent() {
  const { query, page } = useSearchParamsContext();

  if (!query) {
    return (
      <div className="w-full max-w-md mx-auto pt-32">
        <div className="flex flex-col items-center">
          <Image
            src="/images/book-critics-club-logo.png"
            alt="Book Critics Club Logo"
            width={75}
            height={75}
            priority
            className="mb-2"
          />
          <BookSearchBar position="center" />
        </div>
      </div>
    );
  }

  return <BookResults query={query} initialPage={page} />;
}

function MainContent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchParamsProvider>
        <SearchContent />
      </SearchParamsProvider>
    </Suspense>
  );
}

export default function ClientPage(): JSX.Element {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <main className="flex-1 flex items-center justify-center">
          <TextGenerateEffect words={words} />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="flex-1 min-h-screen overflow-y-auto">
        <MainContent />
      </main>
      <Footer />
    </>
  );
}
