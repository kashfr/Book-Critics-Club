'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useContext, Suspense } from 'react';

const SearchParamsContext = createContext<{
  query: string;
  page: number;
}>({
  query: '',
  page: 1,
});

export function useSearchParamsContext() {
  return useContext(SearchParamsContext);
}

function SearchParamsContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  return (
    <SearchParamsContext.Provider value={{ query, page }}>
      {children}
    </SearchParamsContext.Provider>
  );
}

export default function SearchParamsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsContent>{children}</SearchParamsContent>
    </Suspense>
  );
}
