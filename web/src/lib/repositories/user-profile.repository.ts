import mongoose from 'mongoose';
import { UserProfileModel } from '@/lib/db/models/user-profile.model';
import type { IUserProfile, IGymInfo } from '@/lib/db/models/user-profile.model';

export type UpdateProfileData = Partial<
  Pick<
    IUserProfile,
    | 'mobile'
    | 'address'
    | 'dateOfBirth'
    | 'avatarUrl'
    | 'sex'
    | 'height'
    | 'fitnessGoal'
    | 'fitnessLevel'
    | 'certifications'
    | 'bio'
    | 'specializations'
    | 'gymInfo'
  >
>;

export type { IGymInfo };

export interface IUserProfileRepository {
  findByUserId(userId: string): Promise<IUserProfile | null>;
  upsert(userId: string, data: UpdateProfileData): Promise<IUserProfile>;
}

export class MongoUserProfileRepository implements IUserProfileRepository {
  async findByUserId(userId: string): Promise<IUserProfile | null> {
    return UserProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }

  async upsert(userId: string, data: UpdateProfileData): Promise<IUserProfile> {
    const doc = await UserProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: data },
      { upsert: true, new: true },
    );
    return doc!;
  }
}
