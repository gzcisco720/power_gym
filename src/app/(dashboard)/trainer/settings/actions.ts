'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateTrainerProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const mobile = (formData.get('mobile') as string | null) || null;
  const bio = (formData.get('bio') as string | null) || null;
  const specializationsRaw = (formData.get('specializations') as string | null) ?? '';
  const specializations = specializationsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, { mobile, bio, specializations });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
