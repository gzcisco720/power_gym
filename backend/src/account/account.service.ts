import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import type { IUserProfile } from '../database/models/user-profile.model';
import type { UpdateProfileData } from '../repositories/user-profile.repository';
import { ChangePasswordDto } from './dto/change-password.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AccountService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: UserProfileRepository,
  ) {}

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePassword(userId, passwordHash);
    return { success: true };
  }

  async changeEmail(
    userId: string,
    email: string,
  ): Promise<{ success: boolean }> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(normalized);
    if (existing && existing._id.toString() !== userId) {
      throw new ConflictException('Email already in use');
    }
    await this.userRepo.updateEmail(userId, normalized);
    return { success: true };
  }

  async getProfile(userId: string): Promise<IUserProfile | null> {
    return this.profileRepo.findByUserId(userId);
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<IUserProfile> {
    return this.profileRepo.upsert(userId, data);
  }
}
