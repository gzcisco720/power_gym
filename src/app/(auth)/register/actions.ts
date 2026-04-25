'use server';

import bcrypt from 'bcryptjs';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

export interface RegisterState {
  error: string;
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest: string }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = (formData.get('name') ?? '') as string;
  const email = ((formData.get('email') ?? '') as string).toLowerCase().trim();
  const password = (formData.get('password') ?? '') as string;
  const token = (formData.get('token') as string) || null;

  try {
    await connectDB();
    const userRepo = new MongoUserRepository();

    if (!token) {
      const count = await userRepo.count();
      if (count > 0) return { error: 'Must use an invite link' };
      const passwordHash = await bcrypt.hash(password, 12);
      await userRepo.create({ name, email, passwordHash, role: 'owner', trainerId: null });
    } else {
      const inviteRepo = new MongoInviteRepository();
      const invite = await inviteRepo.findByToken(token);
      const validation = validateInviteToken(invite);
      if (!validation.valid) return { error: 'Invalid or expired invite' };
      if (validation.invite.recipientEmail !== email) {
        return { error: 'Email does not match invite' };
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await userRepo.create({
        name,
        email,
        passwordHash,
        role: validation.invite.role,
        trainerId: (validation.invite.trainerId ?? validation.invite.invitedBy).toString(),
      });
      await inviteRepo.markUsed(token);
    }

    await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Registration failed' };
  }

  return { error: '' };
}
