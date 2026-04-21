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
  count(): Promise<number>;
  create(data: CreateUserData): Promise<IUser>;
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email });
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  }
}
