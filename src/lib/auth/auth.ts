import bcrypt from 'bcryptjs';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

export async function authorizeCredentials(
  email: string,
  password: string,
  userRepo: IUserRepository,
): Promise<AuthorizedUser | null> {
  const user = await userRepo.findByEmail(email);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    trainerId: user.trainerId?.toString() ?? null,
  };
}
