'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import eventEmitter from '@/utils/events';

interface BookSearchBarProps {
  position: 'center' | 'header';
}

export default function BookSearchBar({
  position,
}: BookSearchBarProps): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const router = useRouter();
  // const searchParams = useSearchParams();

  const handleSearch = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (query.trim()) {
      await router.push(`/?q=${encodeURIComponent(query.trim())}&page=1`);
      setQuery('');
    }
  };

  useEffect(() => {
    const unsubscribe = eventEmitter.subscribe('resetSearch', () => {
      setQuery('');
    });

    return () => unsubscribe();
  }, []);

  const containerClasses =
    position === 'center'
      ? 'w-full max-w-md mx-auto flex items-center justify-center'
      : 'w-full max-w-md';

  return (
    <form onSubmit={handleSearch} className={containerClasses}>
      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-sm"
          placeholder="Search for books..."
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
        >
          Search
        </button>
      </div>
    </form>
  );
}
