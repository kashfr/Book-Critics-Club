'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid credentials');
    } else {
      onClose();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96 relative z-50">
        <h2 className="text-2xl mb-4">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
            />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="space-y-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => signIn('google')}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => signIn('apple')}
              className="w-full px-4 py-2 bg-black text-white rounded-sm hover:bg-gray-900"
            >
              Sign in with Apple
            </button>
            <button
              type="button"
              onClick={() => signIn('github')}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-sm hover:bg-gray-900"
            >
              Sign in with GitHub
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 rounded-sm"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
