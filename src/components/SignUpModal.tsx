'use client';

import { useState } from 'react';
import axios from 'axios';
import { signIn } from 'next-auth/react';

interface SignUpModalProps {
  onClose: () => void;
}

export default function SignUpModal({ onClose }: SignUpModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/signup', { email, password });
      
      if (response.status === 201) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });
        
        if (result?.ok) {
          onClose();
          window.location.reload(); // Force a full page reload
        }
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setMessage(error.response.data?.message || 'An error occurred.');
      } else {
        setMessage('An error occurred.');
      }
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-sm shadow-lg w-96">
        <h2 className="text-2xl mb-4">Sign Up</h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
            />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
            />
          </div>
          {message && <p className="text-center text-red-500">{message}</p>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-sm"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
