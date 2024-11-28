import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Quicksand, Jost, Raleway } from 'next/font/google';
import './globals.css';
import AuthSessionProvider from '@/components/SessionProvider';
import ClientLayout from '@/components/ClientLayout';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

const quicksand = Quicksand({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand',
});

const jost = Jost({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jost',
});

const raleway = Raleway({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={
          {
            '--font-quicksand': quicksand.style.fontFamily,
            '--font-jost': jost.style.fontFamily,
            '--font-raleway': raleway.style.fontFamily,
          } as React.CSSProperties
        }
      >
        <AuthSessionProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
