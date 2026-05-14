'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-70 cursor-pointer"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in…
        </>
      ) : (
        'Sign in'
      )}
    </Button>
  );
}
