import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IUserProfile,
  USER_PROFILE_MODEL,
} from '../database/models/user-profile.model';

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

@Injectable()
export class UserProfileRepository {
  constructor(
    @InjectModel(USER_PROFILE_MODEL)
    private readonly profileModel: Model<IUserProfile>,
  ) {}

  async findByUserId(userId: string): Promise<IUserProfile | null> {
    return this.profileModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  }

  async upsert(userId: string, data: UpdateProfileData): Promise<IUserProfile> {
    const doc = await this.profileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: data },
      { upsert: true, returnDocument: 'after' },
    );
    return doc;
  }
}
