'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="text-center space-y-4">
          <h1 className="text-[20px] font-semibold text-white">Something went wrong</h1>
          <p className="text-[13px] text-[#444]">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="mt-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
