'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateMemberProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const phone = (formData.get('phone') as string | null) || null;
  const sex = (formData.get('sex') as 'male' | 'female' | null) || null;
  const dateOfBirthRaw = formData.get('dateOfBirth') as string | null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const heightRaw = formData.get('height') as string | null;
  const height = heightRaw ? parseFloat(heightRaw) : null;
  const fitnessGoal =
    (formData.get('fitnessGoal') as
      | 'lose_fat'
      | 'build_muscle'
      | 'maintain'
      | 'improve_performance'
      | null) || null;
  const fitnessLevel =
    (formData.get('fitnessLevel') as 'beginner' | 'intermediate' | 'advanced' | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      phone,
      sex,
      fitnessGoal,
      fitnessLevel,
      ...(dateOfBirth !== null && { dateOfBirth }),
      ...(height !== null && { height }),
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
