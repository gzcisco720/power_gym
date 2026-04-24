import mongoose from 'mongoose';
import type { IUser } from '@/lib/db/models/user.model';
import { UserModel } from '@/lib/db/models/user.model';
import type { UserRole } from '@/types/auth';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: string | null;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  count(): Promise<number>;
  create(data: CreateUserData): Promise<IUser>;
  findByRole(role: 'trainer' | 'member'): Promise<IUser[]>;
  findAllMembers(trainerId?: string): Promise<IUser[]>;
  updateTrainerId(memberId: string, trainerId: string | null): Promise<void>;
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  }

  async findByRole(role: 'trainer' | 'member'): Promise<IUser[]> {
    return UserModel.find({ role });
  }

  async findAllMembers(trainerId?: string): Promise<IUser[]> {
    const filter: Record<string, mongoose.Types.ObjectId | string> = { role: 'member' };
    if (trainerId) {
      filter.trainerId = new mongoose.Types.ObjectId(trainerId);
    }
    return UserModel.find(filter);
  }

  async updateTrainerId(memberId: string, trainerId: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(memberId, {
      $set: { trainerId: trainerId ? new mongoose.Types.ObjectId(trainerId) : null },
    });
  }
}
