'use client';

import { useSession } from 'next-auth/react';
import Header from './Header';
import Background from './Background';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <>
      <Background />
      <Header 
        session={session} 
        status={status} 
        showSearchInHeader={!isHomePage && !!session} 
      />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </>
  );
}
