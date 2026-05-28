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
      { new: true },
    );
  }
}
