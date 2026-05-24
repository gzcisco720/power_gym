import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ROLE_DEFAULT_PATH } from '@/lib/auth/middleware-helpers';
import { getGymBranding } from '@/lib/db/queries/gym-branding';
import Image from 'next/image';
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
        {/* Logo + gym name block, or "Sign in" fallback */}
        <div className="flex flex-col items-center mb-10">
          {branding.loginLogoUrl || branding.name ? (
            <>
              {branding.loginLogoUrl && (
                <div className="relative max-w-[200px] max-h-[120px] mb-5">
                  <Image
                    src={branding.loginLogoUrl}
                    alt={gymName}
                    width={200}
                    height={120}
                    className="object-contain"
                  />
                </div>
              )}
              {branding.name && (
                <div className="text-[11px] font-bold tracking-[5px] text-white uppercase">
                  {branding.name}
                </div>
              )}
            </>
          ) : (
            <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-white">Sign in</h1>
          )}
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
            const remember = formData.get('remember') === 'on' ? 'true' : 'false';

            let redirectTo = '/dashboard';
            try {
              await connectDB();
              const repo = new MongoUserRepository();
              const user = await repo.findByEmail(email);
              if (user) redirectTo = ROLE_DEFAULT_PATH[user.role] ?? '/dashboard';
            } catch {
              // fall through
            }

            let loginErrorType: string | null = null;
            try {
              await signIn('credentials', { email, password, remember, redirectTo });
            } catch (error) {
              if (error instanceof AuthError) {
                loginErrorType = error.type;
              } else {
                throw error;
              }
            }
            if (loginErrorType) redirect(`/login?error=${loginErrorType}`);
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

          <div className="flex items-center gap-2.5">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              aria-label="Remember me"
              className="size-3.5 rounded border-[#333] bg-[#0c0c0c] accent-white cursor-pointer"
            />
            <label htmlFor="remember" className="text-[13px] text-[#666] cursor-pointer select-none">
              Remember me
            </label>
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
