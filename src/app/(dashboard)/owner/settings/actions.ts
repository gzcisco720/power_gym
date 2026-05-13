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

  const mobile = (formData.get('mobile') as string | null)?.trim() || null;
  const gymNameValue = (formData.get('gymName') as string | null)?.trim() || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      mobile,
      gymInfo: gymNameValue
        ? {
            name: gymNameValue,
            address: null,
            phone: null,
            email: null,
            website: null,
            hours: null,
            description: null,
          }
        : null,
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
