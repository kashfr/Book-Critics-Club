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
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState<User>(() => ({
    username: authUser?.displayName || "",
    email: authUser?.email || "user@example.com",
  }));
  const [isUserDataReady, setIsUserDataReady] = useState(
    Boolean(authUser?.displayName)
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

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        console.warn("No auth token available to load profile in dropdown");
        if (authUser.displayName) {
          setProfileData({
            username: authUser.displayName,
            email: authUser.email || "user@example.com",
          });
          setIsUserDataReady(true);
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
          setProfileData({
            username: authUser.displayName,
            email: authUser.email || "user@example.com",
          });
          setIsUserDataReady(true);
        }
        return;
      }

      const data = await response.json();
      const username = data.username || authUser.displayName || "";
      setProfileData({
        username,
        email: data.email || authUser.email || "user@example.com",
      });
      setIsUserDataReady(Boolean(username));
    } catch (error) {
      console.error("Error loading profile for dropdown:", error);
      // Fall back to auth user data on error
      if (authUser.displayName) {
        setProfileData({
          username: authUser.displayName,
          email: authUser.email || "user@example.com",
        });
        setIsUserDataReady(true);
      }
    }
  }

  // Update the original useEffect
  useEffect(() => {
    if (authUser?.displayName) {
      setIsUserDataReady(true);
    }
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
