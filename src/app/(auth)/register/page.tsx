import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';
import { RegisterForm } from './_components/register-form';

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
    if (count > 0) redirect('/login?error=invite-required');
    isFirstUser = true;
  } else {
    await connectDB();
    const inviteRepo = new MongoInviteRepository();
    const invite = await inviteRepo.findByToken(token);
    const validation = validateInviteToken(invite);
    if (!validation.valid) redirect('/login?error=invalid-invite');
    inviteRole = validation.invite.role;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Create account</h1>
          <p className="mt-1 text-[13px] text-[#888]">Complete your registration to get started.</p>
        </div>
        <RegisterForm token={token} inviteRole={inviteRole} isFirstUser={isFirstUser} />
      </div>
    </main>
  );
}
