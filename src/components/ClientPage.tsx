"use client";

import Footer from "@/components/Footer";
import BookResults from "@/components/BookResults";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import Image from "next/image";
import SearchParamsProvider, {
  useSearchParamsContext,
} from "./SearchParamsProvider";
import { Suspense } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

import { motion } from "framer-motion";

const words = `Welcome, bookworm!`;

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
    </div>
  );
}

function SearchContent() {
  const { query, page } = useSearchParamsContext();
  const { user } = useAuth();

  // No query - show landing page (different for authenticated vs unauthenticated)
  if (!query) {
    // Unauthenticated users see the branded landing page
    if (!user) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-120px)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
              BOOK CRITICS <span className="text-primary italic">CLUB</span>
            </h1>
            <div className="text-2xl md:text-3xl font-medium mb-12">
              <TextGenerateEffect words={words} />
            </div>
          </motion.div>
        </div>
      );
    }
    
    // Authenticated users see the discovery page
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-2xl mx-auto pt-32 px-4"
      >
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2
            }}
          >
            <Image
              src="/images/book-critics-club-logo.png"
              alt="Book Critics Club Logo"
              width={100}
              height={100}
              priority
              className="mb-6 drop-shadow-2xl"
            />
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Discover Your Next Favorite Book
          </h1>
          
          <p className="text-lg text-foreground/70 text-center">
            Use the search bar above to find your next read
          </p>
        </div>
      </motion.div>
    );
  }

  // Has query - show search results for everyone
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
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Same experience for all users - MainContent handles the differences
  return (
    <>
      <main className="flex-1 min-h-screen overflow-y-auto">
        <MainContent />
      </main>
      <Footer />
    </>
  );
}
