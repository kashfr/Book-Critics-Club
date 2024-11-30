'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useContext } from 'react';

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

export default function SearchParamsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  return (
    <SearchParamsContext.Provider value={{ query, page }}>
      {children}
    </SearchParamsContext.Provider>
  );
}
