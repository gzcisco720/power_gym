'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { validateMobile } from '@/lib/validation/user';

export interface UpdateProfileState {
  error: string;
}

export interface GymInfoState {
  error: string;
}

export async function updateOwnerProfileAction(
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
  const dateOfBirthRaw = formData.get('dateOfBirth') as string | null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const certRaw = (formData.get('certifications') as string | null) ?? '';
  const certifications = certRaw.split(',').map((s) => s.trim()).filter(Boolean);

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
        certifications,
        ...(dateOfBirth !== null && { dateOfBirth }),
      }),
    ]);
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}

export async function updateGymInfoAction(
  _prev: GymInfoState,
  formData: FormData,
): Promise<GymInfoState> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') return { error: 'Unauthorized' };

  const name = (formData.get('gymName') as string | null)?.trim() || null;
  const address = (formData.get('gymAddress') as string | null)?.trim() || null;
  const phone = (formData.get('gymPhone') as string | null)?.trim() || null;
  const email = (formData.get('gymEmail') as string | null)?.trim() || null;
  const website = (formData.get('gymWebsite') as string | null)?.trim() || null;
  const hours = (formData.get('gymHours') as string | null)?.trim() || null;
  const description = (formData.get('gymDescription') as string | null)?.trim() || null;
  const logoUrl = (formData.get('logoUrl') as string | null) || null;
  const loginBgUrl = (formData.get('loginBgUrl') as string | null) || null;
  const loginLogoUrl = (formData.get('loginLogoUrl') as string | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      gymInfo: { name, address, phone, email, website, hours, description, logoUrl, loginBgUrl, loginLogoUrl },
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save gym info' };
  }
}
