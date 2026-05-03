import mongoose from 'mongoose';
import { CheckInConfigModel, type ICheckInConfig } from '@/lib/db/models/check-in-config.model';

export interface UpsertCheckInConfigData {
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
}

export interface ICheckInConfigRepository {
  upsert(memberId: string, trainerId: string, data: UpsertCheckInConfigData): Promise<ICheckInConfig>;
  findByMember(memberId: string): Promise<ICheckInConfig | null>;
  findDueForReminder(dayOfWeek: number, hour: number, weekStart: Date): Promise<ICheckInConfig[]>;
  markReminderSent(memberId: string, sentAt: Date): Promise<void>;
}

export class MongoCheckInConfigRepository implements ICheckInConfigRepository {
  async upsert(memberId: string, trainerId: string, data: UpsertCheckInConfigData): Promise<ICheckInConfig> {
    const result = await CheckInConfigModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      {
        $set: {
          trainerId: new mongoose.Types.ObjectId(trainerId),
          dayOfWeek: data.dayOfWeek,
          hour: data.hour,
          minute: data.minute,
          active: data.active,
        },
      },
      { upsert: true, new: true },
    );
    return result!;
  }

  async findByMember(memberId: string): Promise<ICheckInConfig | null> {
    return CheckInConfigModel.findOne({ memberId: new mongoose.Types.ObjectId(memberId) });
  }

  async findDueForReminder(dayOfWeek: number, hour: number, weekStart: Date): Promise<ICheckInConfig[]> {
    return CheckInConfigModel.find({
      dayOfWeek,
      hour,
      active: true,
      $or: [{ reminderSentAt: null }, { reminderSentAt: { $lt: weekStart } }],
    });
  }

  async markReminderSent(memberId: string, sentAt: Date): Promise<void> {
    await CheckInConfigModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { reminderSentAt: sentAt } },
    );
  }
}
