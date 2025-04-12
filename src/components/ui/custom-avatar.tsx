"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CustomAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initial: string
}

export function CustomAvatar({ initial, className, ...props }: CustomAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className
      )}
      {...props}
    >
      {initial}
    </div>
  )
}
