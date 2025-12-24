import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { ToastProvider } from "@/context/ToastContext";
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

import Background from "@/components/Background";

const ErrorBoundary = dynamic(() => import("@/components/ErrorBoundary"), {
  ssr: false,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(raleway.variable, "dark")}>
      <body className="flex flex-col min-h-screen relative">
        <Background />
        <AuthSessionProvider>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <Header showSearchInHeader={true} />
                <main className="pt-16 sm:pt-20 flex-1 flex flex-col overflow-x-hidden">
                  {children}
                </main>
              </ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
