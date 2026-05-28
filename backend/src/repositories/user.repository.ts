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

  async findByRole(role: UserRole): Promise<IUser[]> {
    return this.userModel.find({ role });
  }

  async findAllMembers(trainerId?: string): Promise<IUser[]> {
    const filter: { role: 'member'; trainerId?: Types.ObjectId } = {
      role: 'member',
    };
    if (trainerId) {
      filter.trainerId = new Types.ObjectId(trainerId);
    }
    return this.userModel.find(filter);
  }

  async updateTrainerId(
    memberId: string,
    trainerId: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(memberId, {
      $set: {
        trainerId: trainerId ? new Types.ObjectId(trainerId) : null,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $set: { passwordHash } });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { email: email.toLowerCase().trim() },
    });
  }

  async findMembersJoinedByMonth(
    months: number,
  ): Promise<{ label: string; newCount: number }[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.userModel.aggregate<{
      _id: { year: number; month: number };
      count: number;
    }>([
      { $match: { role: 'member', createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const MONTHS = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const rowMap = new Map(
      rows.map((r) => [`${r._id.year}-${r._id.month}`, r.count]),
    );
    const result: { label: string; newCount: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      result.push({
        label: MONTHS[month - 1],
        newCount: rowMap.get(`${year}-${month}`) ?? 0,
      });
    }
    return result;
  }
}
