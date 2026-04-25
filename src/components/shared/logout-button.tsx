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
        className="text-[11px] text-[#333] hover:text-[#555] transition-colors w-full text-left"
      >
        Sign out
      </button>
    </form>
  );
}
