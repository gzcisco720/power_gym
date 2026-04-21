import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

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
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Create account</h1>
          {isFirstUser && (
            <p className="text-sm text-muted-foreground">Setting up your gym as owner</p>
          )}
          {inviteRole && (
            <p className="text-sm text-muted-foreground">
              You were invited as a{' '}
              <span className="font-medium capitalize">{inviteRole}</span>
            </p>
          )}
        </div>

        <form action="/api/auth/register" method="POST" className="space-y-4">
          {token && <input type="hidden" name="token" value={token} />}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
