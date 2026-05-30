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
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  customFee?: number | null;
}

export interface UpdateScheduledSessionData {
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  customFee?: number | null;
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

  async findForBilling(
    memberId: string,
    from: Date,
    to: Date,
  ): Promise<IScheduledSession[]> {
    return this.model
      .find({
        memberIds: new Types.ObjectId(memberId),
        date: { $gte: from, $lte: to },
        status: 'scheduled',
        serviceTypeId: { $ne: null },
      })
      .lean();
  }

  async findSessionsForBillingRange(
    from: Date,
    to: Date,
    trainerId?: string,
  ): Promise<IScheduledSession[]> {
    const query: Record<string, unknown> = {
      date: { $gte: from, $lte: to },
      status: 'scheduled',
      serviceTypeId: { $ne: null },
    };
    if (trainerId) {
      query.trainerId = new Types.ObjectId(trainerId);
    }
    return this.model.find(query).lean();
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
      serviceTypeId: s.serviceTypeId
        ? new Types.ObjectId(s.serviceTypeId)
        : null,
    }));
    return this.model.insertMany(docs);
  }

  async findByDateRange(
    start: Date,
    end: Date,
    filter: { trainerId?: string; memberId?: string } = {},
  ): Promise<IScheduledSession[]> {
    const query: Record<string, unknown> = {
      date: { $gte: start, $lte: end },
      status: 'scheduled',
    };
    if (filter.trainerId) {
      query.trainerId = new Types.ObjectId(filter.trainerId);
    }
    if (filter.memberId) {
      query.memberIds = new Types.ObjectId(filter.memberId);
    }
    return this.model.find(query).sort({ date: 1, startTime: 1 });
  }

  async findById(id: string): Promise<IScheduledSession | null> {
    return this.model.findById(id);
  }

  async updateOne(id: string, data: UpdateScheduledSessionData): Promise<void> {
    const set: Record<string, unknown> = {};
    if (data.trainerId) set.trainerId = new Types.ObjectId(data.trainerId);
    if (data.memberIds)
      set.memberIds = data.memberIds.map((mid) => new Types.ObjectId(mid));
    if (data.startTime) set.startTime = data.startTime;
    if (data.endTime) set.endTime = data.endTime;
    if ('serviceTypeId' in data)
      set.serviceTypeId = data.serviceTypeId
        ? new Types.ObjectId(data.serviceTypeId)
        : null;
    if ('customServiceName' in data)
      set.customServiceName = data.customServiceName;
    if ('customFee' in data) set.customFee = data.customFee;
    await this.model.findByIdAndUpdate(id, { $set: set });
  }

  async updateFuture(
    seriesId: string,
    fromDate: Date,
    data: UpdateScheduledSessionData,
  ): Promise<void> {
    const set: Record<string, unknown> = {};
    if (data.trainerId) set.trainerId = new Types.ObjectId(data.trainerId);
    if (data.memberIds)
      set.memberIds = data.memberIds.map((mid) => new Types.ObjectId(mid));
    if (data.startTime) set.startTime = data.startTime;
    if (data.endTime) set.endTime = data.endTime;
    if ('serviceTypeId' in data)
      set.serviceTypeId = data.serviceTypeId
        ? new Types.ObjectId(data.serviceTypeId)
        : null;
    if ('customServiceName' in data)
      set.customServiceName = data.customServiceName;
    if ('customFee' in data) set.customFee = data.customFee;
    await this.model.updateMany(
      { seriesId: new Types.ObjectId(seriesId), date: { $gte: fromDate } },
      { $set: set },
    );
  }

  async updateAll(
    seriesId: string,
    data: UpdateScheduledSessionData,
  ): Promise<void> {
    const set: Record<string, unknown> = {};
    if (data.trainerId) set.trainerId = new Types.ObjectId(data.trainerId);
    if (data.memberIds)
      set.memberIds = data.memberIds.map((mid) => new Types.ObjectId(mid));
    if (data.startTime) set.startTime = data.startTime;
    if (data.endTime) set.endTime = data.endTime;
    if ('serviceTypeId' in data)
      set.serviceTypeId = data.serviceTypeId
        ? new Types.ObjectId(data.serviceTypeId)
        : null;
    if ('customServiceName' in data)
      set.customServiceName = data.customServiceName;
    if ('customFee' in data) set.customFee = data.customFee;
    await this.model.updateMany(
      { seriesId: new Types.ObjectId(seriesId) },
      { $set: set },
    );
  }

  async cancelOne(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });
  }

  async cancelFuture(seriesId: string, fromDate: Date): Promise<void> {
    await this.model.updateMany(
      { seriesId: new Types.ObjectId(seriesId), date: { $gte: fromDate } },
      { $set: { status: 'cancelled' } },
    );
  }

  async cancelAll(seriesId: string): Promise<void> {
    await this.model.updateMany(
      { seriesId: new Types.ObjectId(seriesId) },
      { $set: { status: 'cancelled' } },
    );
  }
}
