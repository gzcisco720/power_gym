'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { registerAction, type RegisterState } from '../actions';

interface Props {
  token?: string;
  inviteRole?: 'trainer' | 'member' | null;
  isFirstUser: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50"
    >
      {pending ? 'Creating account...' : 'Create account'}
    </Button>
  );
}

export function RegisterForm({ token, inviteRole, isFirstUser }: Props) {
  const [state, action] = useActionState<RegisterState, FormData>(registerAction, { error: '' });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token ?? ''} />

      {inviteRole && (
        <p className="text-[13px] text-[#888]">
          You were invited as a{' '}
          <span className="font-medium capitalize">{inviteRole}</span>.
        </p>
      )}
      {isFirstUser && (
        <p className="text-[13px] text-[#888]">Setting up your gym as owner.</p>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Full Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
