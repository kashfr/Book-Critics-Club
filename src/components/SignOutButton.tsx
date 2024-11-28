'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600"
    >
      Sign Out
    </button>
  );
}
