import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types/auth';

const ROLE_REDIRECT: Record<UserRole, string> = {
  owner: '/owner',
  trainer: '/trainer/members',
  member: '/member/plan',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Sign in</h1>
          <p className="mt-1 text-[13px] text-[#444]">Enter your credentials to continue.</p>
        </div>

        {error === 'CredentialsSignin' && (
          <p className="text-[13px] text-red-400">Invalid email or password.</p>
        )}

        <form
          action={async (formData: FormData) => {
            'use server';
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            // Look up role first so we can redirect directly — avoids a
            // /dashboard → /owner redirect chain that breaks in Playwright.
            let redirectTo = '/dashboard';
            try {
              await connectDB();
              const repo = new MongoUserRepository();
              const user = await repo.findByEmail(email);
              if (user) redirectTo = ROLE_REDIRECT[user.role] ?? '/dashboard';
            } catch {
              // If lookup fails, fall through; signIn will handle the error.
            }

            try {
              await signIn('credentials', { email, password, redirectTo });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=${error.type}`);
              }
              throw error;
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#2a2a2a] focus-visible:ring-white"
            />
          </div>

          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
