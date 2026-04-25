'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  token?: string;
  inviteRole?: 'trainer' | 'member' | null;
  isFirstUser: boolean;
}

export function RegisterForm({ token, inviteRole, isFirstUser }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (fd.get('name') ?? '') as string,
          email: (fd.get('email') ?? '') as string,
          password: (fd.get('password') ?? '') as string,
          token,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }
      router.push('/login');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {inviteRole && (
        <p className="text-[13px] text-[#444]">
          You were invited as a{' '}
          <span className="font-medium capitalize">{inviteRole}</span>.
        </p>
      )}
      {isFirstUser && (
        <p className="text-[13px] text-[#444]">Setting up your gym as owner.</p>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Full Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50"
      >
        {submitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
