'use client';

import { useState } from 'react';
import SignInModal from './SignInModal';

export default function SignInButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
      >
        Sign In
      </button>
      {isModalOpen && <SignInModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
