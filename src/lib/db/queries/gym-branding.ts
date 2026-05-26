import { cache } from 'react';
import { connectDB } from '@/lib/db/connect';
import { UserModel } from '@/lib/db/models/user.model';
import { UserProfileModel } from '@/lib/db/models/user-profile.model';

export interface GymBranding {
  name: string | null;
  logoUrl: string | null;
  loginLogoUrl: string | null;
}

export const getGymBranding = cache(async function getGymBranding(): Promise<GymBranding> {
  await connectDB();
  const owner = await UserModel.findOne({ role: 'owner' }).lean();
  if (!owner) return { name: null, logoUrl: null, loginLogoUrl: null };

  const profile = await UserProfileModel.findOne({ userId: owner._id }).lean();
  const gymInfo = profile?.gymInfo;
  return {
    name: gymInfo?.name ?? null,
    logoUrl: gymInfo?.logoUrl ?? null,
    loginLogoUrl: gymInfo?.loginLogoUrl ?? null,
  };
});
