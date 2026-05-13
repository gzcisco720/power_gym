import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/auth';

export function LogoutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button
        type="submit"
        className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-[#1e1e1e] transition-colors cursor-pointer"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </form>
  );
}
