'use client';

import Spinner from '@/components/Spinner';

export default function Loading() {
  return (
    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center z-50">
      <Spinner />
    </div>
  );
}
