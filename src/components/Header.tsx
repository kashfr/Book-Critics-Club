"use client";

import SignInButton from "./SignInButton";
import SignInModal from "./SignInModal";
import { useState, useEffect } from "react";
import SignUpModal from "./SignUpModal";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import eventEmitter from "@/utils/events";
import BookSearchBar from "./BookSearchBar";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/firebase/auth-context";
import { SimplifiedUserAvatar } from "./simplified-dropdown";
import NotificationBell from "./NotificationBell";
import { Menu, X, BookOpen, Library, User, LogOut } from "lucide-react";

interface HeaderProps {
  showSearchInHeader: boolean;
}

interface HeaderContentProps {
  showSearchInHeader: boolean;
  signOut: () => Promise<void>;
}

function HeaderContent({ showSearchInHeader, signOut }: HeaderContentProps) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    eventEmitter.emit("resetSearch");
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
  };

  const shouldShowSearch = showSearchInHeader;

  // Close mobile menu on route change (e.g., when navigating to a book)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 glass-morphism py-1 sm:py-2 border-b border-white/10">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-[56px] sm:h-[60px] flex items-center justify-end">
          <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-morphism py-1 sm:py-2 border-b border-white/10">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[56px] sm:h-[60px] gap-2 sm:gap-4">
            {/* Left section - Logo */}
            <div className="hidden sm:flex flex-shrink-0">
              <Link
                href="/"
                onClick={handleHomeClick}
                className="text-sm sm:text-base md:text-xl font-black tracking-tighter text-foreground hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                BOOK CRITICS <span className="text-primary italic">CLUB</span>
              </Link>
            </div>

            {/* Mobile Menu Button - Moved to Left */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden flex-shrink-0 p-2 -ml-2 text-foreground hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Center section - Search Bar (hidden on very small screens, expandable) */}
            <div className="flex-1 flex justify-center min-w-0 px-2">
              {shouldShowSearch && <BookSearchBar position="header" />}
            </div>

            {/* Right section - Desktop Navigation & User */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {!user ? (
                <>
                  <SignInButton />
                  <button
                    onClick={() => setIsSignUpOpen(true)}
                    className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    Sign Up
                  </button>
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
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop - Same as SignUpModal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 sm:hidden"
            />

            {/* Slide-out Menu - 3-Layer Glass Structure */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 w-72 z-50 sm:hidden overflow-hidden shadow-2xl rounded-r-2xl max-h-screen overflow-y-auto"
            >
              {/* Layer 1: Dark Base (Mimics page background to ensure contrast) */}
              <div className="absolute inset-0 bg-slate-950/95" />
              
              {/* Layer 2: Glass Effect (The frosting) */}
              <div className="absolute inset-0 glass-morphism border-r border-white/10" />

              {/* Layer 3: Content (Sits on top) */}
              <div className="relative flex flex-col z-10">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <span className="font-bold text-lg tracking-tight text-white">
                    BOOK CRITICS <span className="text-primary italic">CLUB</span>
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-2">
                  <Link
                    href="/"
                    onClick={handleNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <BookOpen size={20} />
                    <span>Home</span>
                  </Link>

                  {user && (
                    <>
                      <Link
                        href="/library"
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Library size={20} />
                        <span>My Library</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <User size={20} />
                        <span>Profile</span>
                      </Link>
                    </>
                  )}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/10">
                  {!user ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsSignInOpen(true);
                        }}
                        className="w-full px-4 py-3 text-center font-medium rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsSignUpOpen(true);
                        }}
                        className="w-full px-4 py-3 text-center font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Sign Up
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <div className="px-4 py-2 text-sm text-muted-foreground">
                        Signed in as{" "}
                        <span className="text-foreground font-medium">
                          {user.displayName || user.email}
                        </span>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign Up Modal */}
      <AnimatePresence>
        {isSignUpOpen && (
          <SignUpModal onClose={() => setIsSignUpOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {isSignInOpen && (
          <SignInModal onClose={() => setIsSignInOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function Header({ showSearchInHeader }: HeaderProps) {
  const { signOut } = useAuth();
  return (
    <Suspense
      fallback={
        <header className="fixed top-0 left-0 right-0 z-50 glass-morphism py-1 sm:py-2 border-b border-white/10">
          <div className="w-full px-3 sm:px-6 lg:px-8 h-[56px] sm:h-[60px] flex items-center justify-end">
            <div className="animate-pulse h-8 w-8 bg-white/10 rounded-full"></div>
          </div>
        </header>
      }
    >
      <HeaderContent
        showSearchInHeader={showSearchInHeader}
        signOut={signOut}
      />
    </Suspense>
  );
}
