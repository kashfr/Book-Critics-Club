"use client";

import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";
import { useState } from "react";
import SignUpModal from "./SignUpModal";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import eventEmitter from "@/utils/events";
import BookSearchBar from "./BookSearchBar";
import { Suspense } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface HeaderProps {
  showSearchInHeader: boolean;
}

function HeaderContent({
  showSearchInHeader,
}: {
  showSearchInHeader: boolean;
}) {
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
    return <div className="max-w-7xl mx-auto px-4">Loading...</div>;
  }

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
          {shouldShowSearch && <BookSearchBar position="header" />}
        </div>
        <div className="flex gap-4">
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
            <SignOutButton />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({ showSearchInHeader }: HeaderProps) {
  return (
    <header className="w-full py-4 bg-white shadow-xs">
      <Suspense
        fallback={<div className="max-w-7xl mx-auto px-4">Loading...</div>}
      >
        <HeaderContent showSearchInHeader={showSearchInHeader} />
      </Suspense>
    </header>
  );
}
