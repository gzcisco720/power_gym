import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../common/models/user.model';
import {
  UserProfile,
  UserProfileDocument,
} from '../../common/models/user-profile.model';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 10;

export interface ProfileResponse {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mobile: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
  sex: 'male' | 'female' | null;
  height: number | null;
  fitnessGoal:
    | 'lose_fat'
    | 'build_muscle'
    | 'maintain'
    | 'improve_performance'
    | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  certifications: string[];
  bio: string | null;
  specializations: string[];
  gymInfo: object | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.userProfileModel.findOne({ userId }).lean();

    return this.mergeProfile(user, profile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const { firstName, lastName, ...profileFields } = dto;

    if (firstName !== undefined || lastName !== undefined) {
      const nameUpdate: Record<string, string> = {};
      if (firstName !== undefined) nameUpdate.firstName = firstName;
      if (lastName !== undefined) nameUpdate.lastName = lastName;

      await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: nameUpdate },
          { returnDocument: 'after' },
        )
        .lean();
    }

    if (Object.keys(profileFields).length > 0) {
      await this.userProfileModel
        .findOneAndUpdate(
          { userId },
          { $set: profileFields },
          { upsert: true, returnDocument: 'after' },
        )
        .lean();
    }

    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();
  }

  async changeEmail(
    userId: string,
    newEmail: string,
    currentPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const existing = await this.userModel
      .findOne({ email: newEmail, _id: { $ne: userId } })
      .lean();
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    user.email = newEmail;
    await user.save();
  }

  async setAvatar(
    userId: string,
    relativeUrl: string,
  ): Promise<{ avatarUrl: string }> {
    await this.userProfileModel
      .findOneAndUpdate(
        { userId },
        { $set: { avatarUrl: relativeUrl } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();

    return { avatarUrl: relativeUrl };
  }

  private mergeProfile(
    user: { firstName: string; lastName: string; email: string; role: string },
    profile: {
      mobile?: string | null;
      address?: string | null;
      dateOfBirth?: Date | null;
      avatarUrl?: string | null;
      sex?: 'male' | 'female' | null;
      height?: number | null;
      fitnessGoal?:
        | 'lose_fat'
        | 'build_muscle'
        | 'maintain'
        | 'improve_performance'
        | null;
      fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | null;
      certifications?: string[];
      bio?: string | null;
      specializations?: string[];
      gymInfo?: object | null;
    } | null,
  ): ProfileResponse {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      mobile: profile?.mobile ?? null,
      address: profile?.address ?? null,
      dateOfBirth: profile?.dateOfBirth ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      sex: profile?.sex ?? null,
      height: profile?.height ?? null,
      fitnessGoal: profile?.fitnessGoal ?? null,
      fitnessLevel: profile?.fitnessLevel ?? null,
      certifications: profile?.certifications ?? [],
      bio: profile?.bio ?? null,
      specializations: profile?.specializations ?? [],
      gymInfo: profile?.gymInfo ?? null,
    };
  }
}
