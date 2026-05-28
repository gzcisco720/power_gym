'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { signIn } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { checkRateLimitByIp } from '@/lib/rate-limit';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';
import { ROLE_DEFAULT_PATH } from '@/lib/auth/middleware-helpers';
import type { UserRole } from '@/types/auth';

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
  const hdrs = await headers();
  const forwarded = hdrs.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : '127.0.0.1').trim();
  if (!checkRateLimitByIp(ip, 'register', 5, 10 * 60_000)) {
    return { error: 'Too many attempts. Please try again in 10 minutes.' };
  }

  const firstName = (formData.get('firstName') ?? '') as string;
  const lastName = (formData.get('lastName') ?? '') as string;
  const email = ((formData.get('email') ?? '') as string).toLowerCase().trim();
  const password = (formData.get('password') ?? '') as string;
  const token = (formData.get('token') as string) || null;

  try {
    await connectDB();
    const userRepo = new MongoUserRepository();
    let role: UserRole = 'owner';

    if (!token) {
      const count = await userRepo.count();
      if (count > 0) return { error: 'Must use an invite link' };
      const passwordHash = await bcrypt.hash(password, 12);
      await userRepo.create({ firstName, lastName, email, passwordHash, role: 'owner', trainerId: null });
      role = 'owner';
    } else {
      const inviteRepo = new MongoInviteRepository();
      const invite = await inviteRepo.findByToken(token);
      const validation = validateInviteToken(invite);
      if (!validation.valid) return { error: 'Invalid or expired invite' };
      if (validation.invite.recipientEmail !== email) {
        return { error: 'Email does not match invite' };
      }
      const passwordHash = await bcrypt.hash(password, 12);
      role = validation.invite.role;
      await userRepo.create({
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        trainerId: (validation.invite.trainerId ?? validation.invite.invitedBy).toString(),
      });
      await inviteRepo.markUsed(token);
    }

    await signIn('credentials', { email, password, redirectTo: ROLE_DEFAULT_PATH[role] });
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Registration failed' };
  }

  return { error: '' };
}
