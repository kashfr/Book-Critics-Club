'use client';

import SignInButton from './SignInButton';
import SignOutButton from './SignOutButton';
import { useState } from 'react';
import SignUpModal from './SignUpModal';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import eventEmitter from '@/utils/events';
import BookSearchBar from './BookSearchBar';
import { Session } from 'next-auth';
import { Suspense } from 'react';

interface HeaderProps {
  session: Session | null;
  showSearchInHeader: boolean;
  status?: 'loading' | 'authenticated' | 'unauthenticated';
}

function HeaderContent({
  session,
  showSearchInHeader,
  status,
}: {
  session: Session | null;
  showSearchInHeader: boolean;
  status?: 'loading' | 'authenticated' | 'unauthenticated';
}) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHomePage = pathname === '/' && !searchParams.get('q');

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    eventEmitter.emit('resetSearch');
    router.push('/');
  };

  const shouldShowSearch = showSearchInHeader && !isHomePage;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="text-3xl font-['var(--font-raleway)'] font-bold text-gray-800"
        >
          Book Critics Club
        </Link>
        <div className="flex-1 flex justify-center">
          {session && shouldShowSearch && <BookSearchBar position="header" />}
        </div>
        <div className="flex gap-4">
          {!session ? (
            <>
              <SignInButton />
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600"
              >
                Sign Up
              </button>
              {isSignUpOpen && (
                <SignUpModal onClose={() => setIsSignUpOpen(false)} />
              )}
            </>
          ) : (
            <SignOutButton />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({
  session,
  showSearchInHeader,
  status,
}: HeaderProps) {
  return (
    <header className="w-full py-4 bg-white shadow-xs">
      <Suspense
        fallback={<div className="max-w-7xl mx-auto px-4">Loading...</div>}
      >
        <HeaderContent
          session={session}
          showSearchInHeader={showSearchInHeader}
          status={status}
        />
      </Suspense>
    </header>
  );
}
