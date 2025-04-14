"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase/client";
import { CustomAvatar } from "./ui/custom-avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Constants for storage
const PROFILE_CACHE_KEY = "user_profile_cache";
const PROFILE_CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

interface User {
  username: string;
  email: string;
  updatedAt?: number;
}

interface SimplifiedUserAvatarProps {
  onSignOut: () => Promise<void>;
}

// Function to get cached profile data if available and not expired
function getCachedProfile(): User | null {
  try {
    const cachedData = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cachedData) return null;

    const profile = JSON.parse(cachedData) as User & { updatedAt: number };
    const now = Date.now();

    // Check if cache is expired
    if (now - profile.updatedAt > PROFILE_CACHE_EXPIRY) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error reading cached profile:", error);
    return null;
  }
}

// Function to cache profile data
function cacheProfile(profile: User): void {
  try {
    const profileWithTimestamp = {
      ...profile,
      updatedAt: Date.now(),
    };
    localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify(profileWithTimestamp)
    );
  } catch (error) {
    console.error("Error caching profile:", error);
  }
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
  const { user: authUser } = useAuth();

  // Try to use cached profile first, then fall back to auth data
  const cachedProfile = getCachedProfile();
  const initialUsername =
    cachedProfile?.username || authUser?.displayName || "";

  const [profileData, setProfileData] = useState<User>(() => ({
    username: initialUsername,
    email: cachedProfile?.email || authUser?.email || "user@example.com",
  }));

  const [isUserDataReady, setIsUserDataReady] = useState(
    Boolean(initialUsername)
  );

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
      return;
    }

    // If we already have a display name from auth or cache, we can consider the
    // data ready while we fetch the latest profile data in the background
    if (profileData.username) {
      setIsUserDataReady(true);
    }

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        console.warn("No auth token available to load profile in dropdown");
        if (authUser.displayName) {
          const updatedProfile = {
            username: authUser.displayName,
            email: authUser.email || "user@example.com",
          };
          setProfileData(updatedProfile);
          setIsUserDataReady(true);
          cacheProfile(updatedProfile);
        }
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
        if (authUser.displayName) {
          const updatedProfile = {
            username: authUser.displayName,
            email: authUser.email || "user@example.com",
          };
          setProfileData(updatedProfile);
          setIsUserDataReady(true);
          cacheProfile(updatedProfile);
        }
        return;
      }

      const data = await response.json();
      const username = data.username || authUser.displayName || "";
      const updatedProfile = {
        username,
        email: data.email || authUser.email || "user@example.com",
      };

      setProfileData(updatedProfile);
      setIsUserDataReady(Boolean(username));

      // Cache the profile data for faster future loads
      if (username) {
        cacheProfile(updatedProfile);
      }
    } catch (error) {
      console.error("Error loading profile for dropdown:", error);
      // Fall back to auth user data on error
      if (authUser.displayName) {
        const updatedProfile = {
          username: authUser.displayName,
          email: authUser.email || "user@example.com",
        };
        setProfileData(updatedProfile);
        setIsUserDataReady(true);
        cacheProfile(updatedProfile);
      }
    }
  }

  // Update the original useEffect
  useEffect(() => {
    if (authUser?.displayName) {
      setIsUserDataReady(true);
    }
    // Fetch fresh profile data (but we already have initial data from cache if available)
    fetchUserProfile();
  }, [authUser]);

  // Only calculate the initial if we have user data ready
  const userInitial =
    isUserDataReady && profileData.username
      ? profileData.username.charAt(0).toUpperCase()
      : "";

  // Updated logout function
  async function handleLogout() {
    try {
      await onSignOut();
      console.log("Sign out successful");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          {userInitial ? (
            <CustomAvatar
              initial={userInitial}
              className="border border-gray-300"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-gray-300" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profileData.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profileData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/profile" passHref>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
