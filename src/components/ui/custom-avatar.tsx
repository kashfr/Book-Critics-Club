"use client";

import * as React from "react";

interface CustomAvatarProps {
  initial: string;
}

export function CustomAvatar({ initial }: CustomAvatarProps) {
  return (
    <div className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
      {initial}
    </div>
  );
}
