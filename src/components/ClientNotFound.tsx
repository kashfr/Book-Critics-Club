'use client';

import Link from 'next/link';
import { Suspense } from 'react';

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
      >
        Return Home
      </Link>
    </div>
  );
}

export default function ClientNotFound() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotFoundContent />
    </Suspense>
  );
}
