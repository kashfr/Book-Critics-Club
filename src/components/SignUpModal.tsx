"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useRouter } from "next/navigation";

interface SignUpModalProps {
  onClose: () => void;
}

export default function SignUpModal({ onClose }: SignUpModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithGithub } = useAuth();

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUp(email, password, username || email.split("@")[0]);
      onClose();
      router.refresh();
    } catch (error: unknown) {
      console.error("Sign up error:", error);
      if (error instanceof Error) {
        setMessage(error.message || "An error occurred during sign up.");
      } else {
        setMessage("An error occurred during sign up.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Google sign up error:", error);
      setMessage("Could not sign up with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setIsLoading(true);
    try {
      await signInWithGithub();
      onClose();
      router.refresh();
    } catch (error) {
      console.error("GitHub sign up error:", error);
      setMessage("Could not sign up with GitHub");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      <div
        ref={modalRef}
        className="bg-white p-6 rounded-sm shadow-lg w-96 relative"
      >
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
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm"
              disabled={isLoading}
              placeholder="Leave blank to use email username"
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
              disabled={isLoading}
            />
          </div>
          {message && <p className="text-center text-red-500">{message}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Signing up..." : "Sign Up with Email"}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={isLoading}
          >
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={handleGithubSignUp}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-sm hover:bg-gray-900 disabled:opacity-50"
            disabled={isLoading}
          >
            Sign up with GitHub
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 rounded-sm hover:bg-gray-400 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
