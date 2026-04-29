'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateOwnerProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const phone = (formData.get('phone') as string | null) || null;
  const gymName = (formData.get('gymName') as string | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, { phone, gymName });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
