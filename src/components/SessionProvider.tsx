'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { type Session } from 'next-auth';

export default function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
