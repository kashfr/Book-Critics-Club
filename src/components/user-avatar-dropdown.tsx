"use client";

import Link from "next/link";
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

// Placeholder for logout function - will integrate with Supabase later
function handleLogout() {
  console.log("Logout clicked");
  // Add Supabase logout logic here
}

// Placeholder for user data - will integrate with Supabase later
const user = {
  username: "User", // Example username
  email: "user@example.com", // Example email
};

export function UserAvatarDropdown() {
  const userInitial = user.username
    ? user.username.charAt(0).toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <CustomAvatar initial={userInitial} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/profile" passHref>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </Link>
          {/* Add other items like Settings, Billing etc. here if needed */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
