'use client';

import SignInButton from './SignInButton';
import SignOutButton from './SignOutButton';
import { useState } from 'react';
import SignUpModal from './SignUpModal';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import eventEmitter from '@/utils/events';
import BookSearchBar from './BookSearchBar';
import { Session } from 'next-auth';

interface HeaderProps {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  showSearchInHeader: boolean;
}

export default function Header({
  session,
  status,
  showSearchInHeader,
}: HeaderProps) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const query = searchParams.get('q');
  const isHomePage = pathname === '/';

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    eventEmitter.emit('resetSearch');
    router.push('/');
  };

  return (
    <header className="w-full py-4 bg-white shadow-xs">
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
            {session && showSearchInHeader && (
              <BookSearchBar position="header" />
            )}
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
    </header>
  );
}
