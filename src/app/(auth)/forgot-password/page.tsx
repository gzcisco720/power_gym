'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Forgot password</h1>
          <p className="mt-1 text-[13px] text-[#888]">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[#aaa]">
              If that email exists, you&apos;ll receive a reset link shortly. Check your inbox.
            </p>
            <Link href="/login" className="text-[13px] text-white underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
            <Link
              href="/login"
              className="block text-center text-[13px] text-[#666] hover:text-[#999]"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
