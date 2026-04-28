import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-[20px] font-semibold text-white">Page not found</h1>
        <p className="text-[13px] text-[#888]">
          This page doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-md hover:bg-white/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
