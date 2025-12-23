"use client";

import SignInButton from "./SignInButton";
import { useState } from "react";
import SignUpModal from "./SignUpModal";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import eventEmitter from "@/utils/events";
import BookSearchBar from "./BookSearchBar";
import { Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/firebase/auth-context";
import { SimplifiedUserAvatar } from "./simplified-dropdown";
import NotificationBell from "./NotificationBell";

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
  const { user, loading } = useAuth();

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    eventEmitter.emit("resetSearch");
    router.push("/");
  };

  // Always show search in header for all visitors
  const shouldShowSearch = showSearchInHeader;

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-end">
        <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full"></div>
      </div>
    );
  }
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-3 items-center h-[60px] gap-2 sm:gap-4">
        {/* Left section - Logo */}
        <div className="flex justify-start">
          <Link
            href="/"
            onClick={handleHomeClick}
            className="text-base sm:text-xl font-black tracking-tighter text-foreground hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            BOOK CRITICS <span className="text-primary italic">CLUB</span>
          </Link>
        </div>

        {/* Center section - Search Bar */}
        <div className="flex justify-center col-span-1">
          {shouldShowSearch && <BookSearchBar position="header" />}
        </div>

        {/* Right section - Navigation & User */}
        <div className="flex items-center justify-end gap-2 sm:gap-4">
          {!user ? (
            <>
              <SignInButton />
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity text-sm"
              >
                Sign Up
              </button>
              <AnimatePresence>
                {isSignUpOpen && (
                  <SignUpModal onClose={() => setIsSignUpOpen(false)} />
                )}
              </AnimatePresence>
            </>
          ) : (
            <>
              <Link
                href="/library"
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                My Library
              </Link>
              <NotificationBell />
              <SimplifiedUserAvatar onSignOut={signOut} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({ showSearchInHeader }: HeaderProps) {
  const { signOut } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-morphism py-2 border-b border-white/10">
      <Suspense
        fallback={
          <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-end">
            <div className="animate-pulse h-8 w-8 bg-white/10 rounded-full"></div>
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
