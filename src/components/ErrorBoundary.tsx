'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reset error boundary on route changes
    // You can add error reporting here if needed
  }, [pathname, searchParams]);

  return <>{children}</>;
}
