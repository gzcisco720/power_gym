'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function ResetPasswordForm() {
  const { get } = useSearchParams();
  const { push } = useRouter();
  const token = get('token') ?? '';
  const userId = get('id') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, newPassword }),
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Reset failed. The link may have expired.');
    } else {
      push('/login?message=password-reset');
    }
  }

  if (!token || !userId) {
    return (
      <p className="text-[13px] text-red-400">
        Invalid reset link. Please request a new one.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="newPassword"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          New Password
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
        />
        <p className="text-[11px] text-[#666]">Min 8 characters, 1 uppercase, 1 number</p>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-semibold tracking-[-0.5px] text-white">Reset password</h1>
          <p className="mt-1 text-[13px] text-[#888]">Enter your new password below.</p>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
