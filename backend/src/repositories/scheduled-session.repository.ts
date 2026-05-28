import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IScheduledSession,
  SCHEDULED_SESSION_MODEL,
} from '../database/models/scheduled-session.model';

export interface CreateScheduledSessionData {
  trainerId: string;
  memberIds: string[];
  date: Date;
  startTime: string;
  endTime: string;
  seriesId?: string | null;
}

@Injectable()
export class ScheduledSessionRepository {
  constructor(
    @InjectModel(SCHEDULED_SESSION_MODEL)
    private readonly model: Model<IScheduledSession>,
  ) {}

  async create(data: CreateScheduledSessionData): Promise<IScheduledSession> {
    const doc = new this.model({
      trainerId: new Types.ObjectId(data.trainerId),
      memberIds: data.memberIds.map((id) => new Types.ObjectId(id)),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      seriesId: data.seriesId ? new Types.ObjectId(data.seriesId) : null,
    });
    return doc.save();
  }

  async findByMember(memberId: string): Promise<IScheduledSession[]> {
    return this.model
      .find({ memberIds: new Types.ObjectId(memberId) })
      .sort({ date: 1, startTime: 1 });
  }

  async findByIdAndTrainer(
    id: string,
    trainerId: string,
  ): Promise<IScheduledSession | null> {
    return this.model.findOne({
      _id: new Types.ObjectId(id),
      trainerId: new Types.ObjectId(trainerId),
    });
  }

  async cancelById(id: string): Promise<IScheduledSession | null> {
    return this.model.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    );
  }

  async findUnreminded(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<IScheduledSession[]> {
    return this.model.find({
      status: 'scheduled',
      date: { $gte: windowStart, $lt: windowEnd },
      reminderSentAt: null,
    });
  }

  async markReminderSent(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      $set: { reminderSentAt: new Date() },
    });
  }

  async findActiveSeriesIds(): Promise<string[]> {
    const results = await this.model.distinct('seriesId', {
      seriesId: { $ne: null },
      status: 'scheduled',
    });
    return results.map((id: Types.ObjectId) => id.toString());
  }

  async findLatestInSeries(
    seriesId: string,
  ): Promise<IScheduledSession | null> {
    return this.model
      .findOne({ seriesId: new Types.ObjectId(seriesId), status: 'scheduled' })
      .sort({ date: -1 });
  }

  async createMany(
    sessions: CreateScheduledSessionData[],
  ): Promise<IScheduledSession[]> {
    const docs = sessions.map((s) => ({
      trainerId: new Types.ObjectId(s.trainerId),
      memberIds: s.memberIds.map((id) => new Types.ObjectId(id)),
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      seriesId: s.seriesId ? new Types.ObjectId(s.seriesId) : null,
    }));
    return this.model.insertMany(docs);
  }
}
