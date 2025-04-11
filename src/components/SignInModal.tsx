"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useRouter } from "next/navigation";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithGithub } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Google sign in error:", err);
      setError("Could not sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGithub();
      onClose();
      router.refresh();
    } catch (err) {
      console.error("GitHub sign in error:", err);
      setError("Could not sign in with GitHub");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      <div
        ref={modalRef}
        className="bg-white p-8 rounded-lg shadow-xl w-96 relative"
      >
        <h2 className="text-2xl mb-4">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="space-y-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={handleGithubSignIn}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-sm hover:bg-gray-900 disabled:opacity-50"
              disabled={isLoading}
            >
              Sign in with GitHub
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 rounded-sm hover:bg-gray-300 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
