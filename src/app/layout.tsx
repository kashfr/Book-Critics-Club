import type { Metadata } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/options';
import Header from '@/components/Header';
import dynamic from 'next/dynamic';
import AuthSessionProvider from '@/components/SessionProvider';

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: 'Book Critics Club',
  description:
    'A community for book lovers to share their thoughts and track their reading progress.',
};

const ErrorBoundary = dynamic(() => import('@/components/ErrorBoundary'), {
  ssr: false,
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={raleway.variable}>
      <body className="flex flex-col min-h-screen">
        <AuthSessionProvider session={session}>
          <ErrorBoundary>
            <Header
              session={session}
              status={session ? 'authenticated' : 'unauthenticated'}
              showSearchInHeader={true}
            />
            {children}
          </ErrorBoundary>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
