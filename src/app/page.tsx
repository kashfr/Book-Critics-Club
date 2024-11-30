'use client';

import { useSession } from 'next-auth/react';
import Footer from '@/components/Footer';
import BookResults from '@/components/BookResults';
import { useSearchParams } from 'next/navigation';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import BookSearchBar from '@/components/BookSearchBar';
import Image from 'next/image';
import { Suspense } from 'react';

const words = `Welcome, bookworm! Please sign in.`;

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

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
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

export default function Home(): JSX.Element {
  const { data: session } = useSession();

  if (!session) {
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
