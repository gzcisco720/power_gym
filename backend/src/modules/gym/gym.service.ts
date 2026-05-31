import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  GymInfo,
  UserProfile,
  UserProfileDocument,
} from '../../common/models/user-profile.model';
import { UpdateGymInfoDto } from './dto/update-gym-info.dto';

export interface BrandingResponse {
  gymName: string | null;
  logoUrl: string | null;
}

@Injectable()
export class GymService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  async getBranding(): Promise<BrandingResponse> {
    const owner = await this.userModel.findOne({ role: 'owner' }).lean();
    if (!owner) {
      return { gymName: null, logoUrl: null };
    }

    const profile = await this.userProfileModel
      .findOne({ userId: owner._id })
      .lean();

    return {
      gymName: profile?.gymInfo?.name ?? null,
      logoUrl: profile?.gymInfo?.logoUrl ?? null,
    };
  }

  async getInfo(ownerUserId: string): Promise<GymInfo | null> {
    const userObjectId = new Types.ObjectId(ownerUserId);
    const profile = await this.userProfileModel
      .findOne({ userId: userObjectId })
      .lean();

    return profile?.gymInfo ?? null;
  }

  async updateInfo(
    ownerUserId: string,
    dto: UpdateGymInfoDto,
  ): Promise<GymInfo | null> {
    const userObjectId = new Types.ObjectId(ownerUserId);
    const gymInfoUpdate: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        gymInfoUpdate[`gymInfo.${key}`] = value as string;
      }
    }

    const updated = await this.userProfileModel
      .findOneAndUpdate(
        { userId: userObjectId },
        { $set: gymInfoUpdate },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();

    return updated?.gymInfo ?? null;
  }

  async setLogo(
    ownerUserId: string,
    kind: 'sidebar' | 'login',
    relativeUrl: string,
  ): Promise<{ logoUrl: string }> {
    const userObjectId = new Types.ObjectId(ownerUserId);
    const field = kind === 'login' ? 'gymInfo.loginLogoUrl' : 'gymInfo.logoUrl';

    await this.userProfileModel
      .findOneAndUpdate(
        { userId: userObjectId },
        { $set: { [field]: relativeUrl } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();

    return { logoUrl: relativeUrl };
  }
}
