import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IUser, USER_MODEL } from '../database/models/user.model';
import type { UserRole } from '../common/interfaces/auth-user.interface';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: string | null;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(USER_MODEL) private readonly userModel: Model<IUser>,
  ) {}

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<IUser | null> {
    return this.userModel.findById(id);
  }

  async count(): Promise<number> {
    return this.userModel.countDocuments();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = new this.userModel({
      ...data,
      trainerId: data.trainerId ? new Types.ObjectId(data.trainerId) : null,
    });
    return user.save();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $set: { passwordHash } });
  }
}
