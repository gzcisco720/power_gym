'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h2 className="text-[18px] font-semibold text-white">Something went wrong</h2>
      <p className="text-[13px] text-[#444] max-w-sm text-center">
        {error.message || 'An unexpected error occurred on this page.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
      >
        Try again
      </button>
    </div>
  );
}
