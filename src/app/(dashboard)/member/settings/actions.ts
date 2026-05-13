'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { validateMobile } from '@/lib/validation/user';

export interface UpdateProfileState {
  error: string;
}

export async function updateMemberProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const firstName = (formData.get('firstName') as string | null)?.trim() || null;
  const lastName = (formData.get('lastName') as string | null)?.trim() || null;
  const mobile = (formData.get('mobile') as string | null)?.trim() || null;
  const address = (formData.get('address') as string | null)?.trim() || null;
  const avatarUrl = (formData.get('avatarUrl') as string | null) || null;
  const sex = (formData.get('sex') as 'male' | 'female' | null) || null;
  const dateOfBirthRaw = formData.get('dateOfBirth') as string | null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const fitnessGoal = (formData.get('fitnessGoal') as 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null) || null;
  const fitnessLevel = (formData.get('fitnessLevel') as 'beginner' | 'intermediate' | 'advanced' | null) || null;

  if (!firstName || !lastName) return { error: 'First and last name are required' };
  if (mobile) {
    const mobileError = validateMobile(mobile);
    if (mobileError) return { error: mobileError };
  }

  try {
    await connectDB();
    await Promise.all([
      new MongoUserRepository().updateName(session.user.id, firstName, lastName),
      new MongoUserProfileRepository().upsert(session.user.id, {
        mobile,
        address,
        avatarUrl,
        sex,
        fitnessGoal,
        fitnessLevel,
        ...(dateOfBirth !== null && { dateOfBirth }),
      }),
    ]);
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
