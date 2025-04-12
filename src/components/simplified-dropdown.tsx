"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase/client";

interface User {
  username: string;
  email: string;
}

interface SimplifiedUserAvatarProps {
  onSignOut: () => Promise<void>;
}

// Function to get Firebase auth token
async function getCurrentUserIdToken(): Promise<string | null> {
  try {
    const firebaseAuth = getAuth(app);
    const currentUser = firebaseAuth.currentUser;

    if (currentUser) {
      return await currentUser.getIdToken(true);
    }
    return null;
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

export function SimplifiedUserAvatar({ onSignOut }: SimplifiedUserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState<User>({
    username: "User",
    email: authUser?.email || "user@example.com",
  });
  const [loading, setLoading] = useState(true);

  // Add an effect to listen for profile changes
  useEffect(() => {
    function handleProfileChange() {
      // Refresh profile data when profile changes
      console.log("Profile changed event detected, refreshing dropdown data");
      fetchUserProfile();
    }

    window.addEventListener("profileChanged", handleProfileChange);

    return () => {
      window.removeEventListener("profileChanged", handleProfileChange);
    };
  }, []);

  // We need to move fetchUserProfile outside the first useEffect
  // for it to be available in the event listener
  async function fetchUserProfile() {
    if (!authUser) {
      setLoading(false);
      return;
    }

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        console.warn("No auth token available to load profile in dropdown");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        if (response.status !== 404) {
          // 404 is expected for new users
          console.error(
            "Failed to load profile for dropdown:",
            response.status
          );
        }
        // Fall back to auth user data
        setProfileData({
          username: authUser.displayName || "User",
          email: authUser.email || "user@example.com",
        });
        setLoading(false);
        return;
      }

      const data = await response.json();
      setProfileData({
        username: data.username || authUser.displayName || "User",
        email: data.email || authUser.email || "user@example.com",
      });
    } catch (error) {
      console.error("Error loading profile for dropdown:", error);
      // Fall back to auth user data on error
      setProfileData({
        username: authUser.displayName || "User",
        email: authUser.email || "user@example.com",
      });
    } finally {
      setLoading(false);
    }
  }

  // Update the original useEffect
  useEffect(() => {
    fetchUserProfile();
  }, [authUser]);

  const userInitial = profileData.username
    ? profileData.username.charAt(0).toUpperCase()
    : "?";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Updated logout function
  async function handleLogout() {
    setIsOpen(false);
    try {
      await onSignOut();
      console.log("Sign out successful");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar - perfect circle with initial */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#e5e7eb",
          color: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "500",
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "2px solid #d1d5db",
        }}
        aria-label="User menu"
      >
        {loading ? "·" : userInitial}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* User info */}
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium">{profileData.username}</p>
              <p className="text-xs text-gray-500">{profileData.email}</p>
            </div>

            {/* Menu items */}
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-t"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
