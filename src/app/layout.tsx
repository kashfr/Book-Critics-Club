import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/lib/firebase/auth-context";
import AuthSessionProvider from "@/components/SessionProvider";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

export const metadata: Metadata = {
  title: "Book Critics Club",
  description:
    "A community for book lovers to share their thoughts and track their reading progress.",
};

const ErrorBoundary = dynamic(() => import("@/components/ErrorBoundary"), {
  ssr: false,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={raleway.variable}>
      <body className="flex flex-col min-h-screen">
        <AuthSessionProvider>
          <AuthProvider>
            <ErrorBoundary>
              <Header showSearchInHeader={true} />
              {children}
            </ErrorBoundary>
          </AuthProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
