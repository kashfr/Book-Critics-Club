"use client";

import { useAuth } from "@/lib/firebase/auth-context";

export default function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600"
    >
      Sign Out
    </button>
  );
}
