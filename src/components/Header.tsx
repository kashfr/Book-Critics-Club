"use client";

import SignInButton from "./SignInButton";
import { useState } from "react";
import SignUpModal from "./SignUpModal";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import eventEmitter from "@/utils/events";
import BookSearchBar from "./BookSearchBar";
import { Suspense } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { SimplifiedUserAvatar } from "./simplified-dropdown";

interface HeaderProps {
  showSearchInHeader: boolean;
}

interface HeaderContentProps {
  showSearchInHeader: boolean;
  signOut: () => Promise<void>;
}

function HeaderContent({ showSearchInHeader, signOut }: HeaderContentProps) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHomePage = pathname === "/" && !searchParams.get("q");
  const { user, loading } = useAuth();

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    eventEmitter.emit("resetSearch");
    router.push("/");
  };

  const shouldShowSearch = showSearchInHeader && !isHomePage && user;

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-end">
        <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-[60px]">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="text-3xl font-['var(--font-raleway)'] font-bold text-gray-800"
        >
          Book Critics Club
        </Link>
        <div className="flex-1 flex justify-center px-4">
          {shouldShowSearch && <BookSearchBar position="header" />}
        </div>
        <div className="flex items-center gap-4">
          {!user ? (
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
            <SimplifiedUserAvatar onSignOut={signOut} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({ showSearchInHeader }: HeaderProps) {
  const { signOut } = useAuth();
  return (
    <header className="w-full py-4 bg-white shadow-xs">
      <Suspense
        fallback={
          <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-end">
            <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full"></div>
          </div>
        }
      >
        <HeaderContent
          showSearchInHeader={showSearchInHeader}
          signOut={signOut}
        />
      </Suspense>
    </header>
  );
}
