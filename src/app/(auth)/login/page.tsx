import { signIn } from '@/lib/auth/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Sign in</h1>
          <p className="mt-1 text-[13px] text-[#444]">Enter your credentials to continue.</p>
        </div>

        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('credentials', {
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              redirectTo: '/dashboard',
            });
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
