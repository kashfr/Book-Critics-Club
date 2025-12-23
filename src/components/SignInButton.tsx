'use client';

import { useState } from 'react';
import SignInModal from './SignInModal';
import { AnimatePresence } from 'framer-motion';

export default function SignInButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-foreground border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
      >
        Sign In
      </button>
      <AnimatePresence>
        {isModalOpen && <SignInModal onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
