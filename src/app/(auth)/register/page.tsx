import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let isFirstUser = false;
  let inviteRole: 'trainer' | 'member' | null = null;

  if (!token) {
    await connectDB();
    const { MongoUserRepository } = await import('@/lib/repositories/user.repository');
    const userRepo = new MongoUserRepository();
    const count = await userRepo.count();

    if (count > 0) {
      redirect('/login?error=invite-required');
    }
    isFirstUser = true;
  } else {
    await connectDB();
    const inviteRepo = new MongoInviteRepository();
    const invite = await inviteRepo.findByToken(token);
    const validation = validateInviteToken(invite);

    if (!validation.valid) {
      redirect('/login?error=invalid-invite');
    }
    inviteRole = validation.invite.role;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Create account</h1>
          <p className="mt-1 text-[13px] text-[#444]">Complete your registration to get started.</p>
          {isFirstUser && (
            <p className="mt-1 text-[13px] text-[#444]">Setting up your gym as owner.</p>
          )}
          {inviteRole && (
            <p className="mt-1 text-[13px] text-[#444]">
              You were invited as a{' '}
              <span className="font-medium capitalize">{inviteRole}</span>.
            </p>
          )}
        </div>

        <form action="/api/auth/register" method="POST" className="space-y-4">
          {token && <input type="hidden" name="token" value={token} />}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">
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

          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2">
            Create account
          </Button>
        </form>
      </div>
    </main>
  );
}
