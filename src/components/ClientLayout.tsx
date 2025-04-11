"use client";

import { useSession } from "next-auth/react";
import Header from "./Header";
import Background from "./Background";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <>
      <Background />
      <Header showSearchInHeader={!isHomePage && !!session} />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </>
  );
}
