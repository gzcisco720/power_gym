import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ROLE_DEFAULT_PATH } from '@/lib/auth/middleware-helpers';
import { getGymBranding } from '@/lib/db/queries/gym-branding';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { LoginButton } from './_components/login-button';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ error, message }, branding] = await Promise.all([
    searchParams,
    getGymBranding(),
  ]);

  const gymName = branding.name ?? 'POWER GYM';

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#030303]" />

      {/* Form */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + gym name block */}
        <div className="flex flex-col items-center mb-10">
          {branding.loginLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.loginLogoUrl}
              alt={gymName}
              className="max-w-[200px] max-h-[120px] object-contain mb-5"
            />
          )}
          <div className="text-[11px] font-bold tracking-[5px] text-white uppercase">
            {gymName}
          </div>
        </div>

        {error === 'CredentialsSignin' && (
          <p className="mb-4 text-[13px] text-red-400">Invalid email or password.</p>
        )}

        {message === 'password-reset' && (
          <p className="mb-4 text-[13px] text-green-400">Password reset successfully. Please sign in.</p>
        )}

        <form
          action={async (formData: FormData) => {
            'use server';
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            let redirectTo = '/dashboard';
            try {
              await connectDB();
              const repo = new MongoUserRepository();
              const user = await repo.findByEmail(email);
              if (user) redirectTo = ROLE_DEFAULT_PATH[user.role] ?? '/dashboard';
            } catch {
              // fall through
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
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
            />
          </div>

          <LoginButton />
          <Link
            href="/forgot-password"
            className="block text-center text-[13px] text-[#666] hover:text-[#999]"
          >
            Forgot password?
          </Link>
        </form>
      </div>
    </main>
  );
}
