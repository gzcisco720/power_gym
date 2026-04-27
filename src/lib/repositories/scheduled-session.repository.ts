import mongoose from 'mongoose';
import type { IScheduledSession } from '@/lib/db/models/scheduled-session.model';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

export interface CreateScheduledSessionData {
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: Date;
  startTime: string;
  endTime: string;
}

export interface UpdateScheduledSessionData {
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
}

export interface FindByDateRangeOptions {
  trainerId?: string;
  memberId?: string;
}

export interface IScheduledSessionRepository {
  create(data: CreateScheduledSessionData): Promise<IScheduledSession>;
  createMany(data: CreateScheduledSessionData[]): Promise<void>;
  findByDateRange(start: Date, end: Date, options?: FindByDateRangeOptions): Promise<IScheduledSession[]>;
  findByMember(memberId: string): Promise<IScheduledSession[]>;
  findById(id: string): Promise<IScheduledSession | null>;
  updateOne(id: string, data: UpdateScheduledSessionData): Promise<void>;
  updateFuture(seriesId: string, fromDate: Date, data: UpdateScheduledSessionData): Promise<void>;
  updateAll(seriesId: string, data: UpdateScheduledSessionData): Promise<void>;
  cancelOne(id: string): Promise<void>;
  cancelFuture(seriesId: string, fromDate: Date): Promise<void>;
  cancelAll(seriesId: string): Promise<void>;
  findUnreminded(windowStart: Date, windowEnd: Date): Promise<IScheduledSession[]>;
  markReminderSent(id: string): Promise<void>;
  findActiveSeriesIds(): Promise<string[]>;
  findLatestInSeries(seriesId: string): Promise<IScheduledSession | null>;
  removeMemberFromFutureSessions(memberId: string): Promise<void>;
}

function toOid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

interface UpdateSetDoc {
  trainerId?: mongoose.Types.ObjectId;
  memberIds?: mongoose.Types.ObjectId[];
  startTime?: string;
  endTime?: string;
}

function buildUpdateSet(data: UpdateScheduledSessionData): { $set: UpdateSetDoc } {
  const $set: UpdateSetDoc = {};
  if (data.trainerId !== undefined) $set.trainerId = toOid(data.trainerId);
  if (data.memberIds !== undefined) $set.memberIds = data.memberIds.map(toOid);
  if (data.startTime !== undefined) $set.startTime = data.startTime;
  if (data.endTime !== undefined) $set.endTime = data.endTime;
  return { $set };
}

export class MongoScheduledSessionRepository implements IScheduledSessionRepository {
  async create(data: CreateScheduledSessionData): Promise<IScheduledSession> {
    const doc = new ScheduledSessionModel({
      seriesId: data.seriesId ? toOid(data.seriesId) : null,
      trainerId: toOid(data.trainerId),
      memberIds: data.memberIds.map(toOid),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    });
    return doc.save();
  }

  async createMany(data: CreateScheduledSessionData[]): Promise<void> {
    await ScheduledSessionModel.insertMany(
      data.map((d) => ({
        seriesId: d.seriesId ? toOid(d.seriesId) : null,
        trainerId: toOid(d.trainerId),
        memberIds: d.memberIds.map(toOid),
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      })),
    );
  }

  async findByDateRange(start: Date, end: Date, options?: FindByDateRangeOptions): Promise<IScheduledSession[]> {
    const filter: {
      date: { $gte: Date; $lte: Date };
      trainerId?: mongoose.Types.ObjectId;
      memberIds?: mongoose.Types.ObjectId;
    } = { date: { $gte: start, $lte: end } };
    if (options?.trainerId) filter.trainerId = toOid(options.trainerId);
    if (options?.memberId) filter.memberIds = toOid(options.memberId);
    return ScheduledSessionModel.find(filter).sort({ date: 1, startTime: 1 });
  }

  async findByMember(memberId: string): Promise<IScheduledSession[]> {
    return ScheduledSessionModel.find({ memberIds: toOid(memberId) }).sort({ date: 1, startTime: 1 });
  }

  async findById(id: string): Promise<IScheduledSession | null> {
    return ScheduledSessionModel.findById(id);
  }

  async updateOne(id: string, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, buildUpdateSet(data));
  }

  async updateFuture(seriesId: string, fromDate: Date, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), date: { $gte: fromDate }, status: 'scheduled' },
      buildUpdateSet(data),
    );
  }

  async updateAll(seriesId: string, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.updateMany({ seriesId: toOid(seriesId), status: 'scheduled' }, buildUpdateSet(data));
  }

  async cancelOne(id: string): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });
  }

  async cancelFuture(seriesId: string, fromDate: Date): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), date: { $gte: fromDate }, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }

  async cancelAll(seriesId: string): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }

  async findUnreminded(windowStart: Date, windowEnd: Date): Promise<IScheduledSession[]> {
    return ScheduledSessionModel.find({
      status: 'scheduled',
      date: { $gte: windowStart, $lte: windowEnd },
      reminderSentAt: null,
    });
  }

  async markReminderSent(id: string): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, { $set: { reminderSentAt: new Date() } });
  }

  async findActiveSeriesIds(): Promise<string[]> {
    const ids = await ScheduledSessionModel.distinct('seriesId', {
      status: 'scheduled',
      date: { $gte: new Date() },
      seriesId: { $ne: null },
    });
    return (ids as mongoose.Types.ObjectId[]).map((id) => id.toString());
  }

  async findLatestInSeries(seriesId: string): Promise<IScheduledSession | null> {
    return ScheduledSessionModel.findOne({ seriesId: toOid(seriesId) }).sort({ date: -1 });
  }

  async removeMemberFromFutureSessions(memberId: string): Promise<void> {
    const now = new Date();
    const memberOid = toOid(memberId);
    await ScheduledSessionModel.updateMany(
      { memberIds: memberOid, date: { $gte: now }, status: 'scheduled' },
      { $pull: { memberIds: memberOid } },
    );
    await ScheduledSessionModel.updateMany(
      { memberIds: { $size: 0 }, date: { $gte: now }, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }
}
