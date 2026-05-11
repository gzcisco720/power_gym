import mongoose from 'mongoose';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

export interface CreateSelfWorkoutLogData {
  userId: string;
  startedAt: Date;
  sourceTemplateId: string | null;
  sourceTemplateDayNumber: number | null;
  dayName: string;
  sets: ISelfWorkoutSet[];
}

export interface UpdateSelfSetData {
  actualWeight: number | null;
  actualReps: number | null;
}

export interface ISelfWorkoutLogRepository {
  create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog>;
  findById(id: string, userId: string): Promise<ISelfWorkoutLog | null>;
  findActive(userId: string): Promise<ISelfWorkoutLog | null>;
  findToday(userId: string): Promise<ISelfWorkoutLog | null>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]>;
  findRecent(userId: string, limit: number): Promise<ISelfWorkoutLog[]>;
  findLastByTemplate(userId: string): Promise<ISelfWorkoutLog | null>;
  findStaleActive(olderThanHours: number): Promise<ISelfWorkoutLog[]>;
  appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null>;
  updateSet(id: string, userId: string, setIndex: number, patch: UpdateSelfSetData): Promise<ISelfWorkoutLog | null>;
  complete(id: string, userId: string, rpe: number | null, note: string | null): Promise<ISelfWorkoutLog | null>;
  seal(id: string, userId: string): Promise<ISelfWorkoutLog | null>;
  autoSeal(id: string): Promise<ISelfWorkoutLog | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);

export class MongoSelfWorkoutLogRepository implements ISelfWorkoutLogRepository {
  async create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog> {
    const doc = new SelfWorkoutLogModel({
      userId: oid(data.userId),
      startedAt: data.startedAt,
      completedAt: null,
      lastActivityAt: data.startedAt,
      autoSealed: false,
      sourceTemplateId: data.sourceTemplateId ? oid(data.sourceTemplateId) : null,
      sourceTemplateDayNumber: data.sourceTemplateDayNumber,
      dayName: data.dayName,
      sets: data.sets,
      rpe: null,
      note: null,
    });
    return doc.save();
  }

  async findById(id: string, userId: string): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOne({ _id: oid(id), userId: oid(userId) });
  }

  async findActive(userId: string): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOne({ userId: oid(userId), completedAt: null }).sort({ startedAt: -1 });
  }

  async findToday(userId: string): Promise<ISelfWorkoutLog | null> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return SelfWorkoutLogModel.findOne({
      userId: oid(userId),
      startedAt: { $gte: start, $lt: end },
    }).sort({ startedAt: -1 });
  }

  async findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return SelfWorkoutLogModel.find({
      userId: oid(userId),
      completedAt: { $gte: start, $lt: end },
    }).sort({ completedAt: 1 });
  }

  async findRecent(userId: string, limit: number): Promise<ISelfWorkoutLog[]> {
    return SelfWorkoutLogModel.find({
      userId: oid(userId),
      completedAt: { $ne: null },
    })
      .sort({ completedAt: -1 })
      .limit(limit);
  }

  async findLastByTemplate(userId: string): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOne({
      userId: oid(userId),
      sourceTemplateId: { $ne: null },
      completedAt: { $ne: null },
    }).sort({ completedAt: -1 });
  }

  async findStaleActive(olderThanHours: number): Promise<ISelfWorkoutLog[]> {
    const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
    return SelfWorkoutLogModel.find({
      completedAt: null,
      lastActivityAt: { $lt: cutoff },
    });
  }

  async appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $push: { sets: set }, $set: { lastActivityAt: new Date() } },
      { new: true },
    );
  }

  async updateSet(
    id: string,
    userId: string,
    setIndex: number,
    patch: UpdateSelfSetData,
  ): Promise<ISelfWorkoutLog | null> {
    const now = new Date();
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: patch.actualWeight,
          [`sets.${setIndex}.actualReps`]: patch.actualReps,
          [`sets.${setIndex}.completedAt`]: now,
          lastActivityAt: now,
        },
      },
      { new: true },
    );
  }

  async complete(
    id: string,
    userId: string,
    rpe: number | null,
    note: string | null,
  ): Promise<ISelfWorkoutLog | null> {
    const now = new Date();
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $set: { completedAt: now, lastActivityAt: now, rpe, note } },
      { new: true },
    );
  }

  // User-initiated cross-day save: backdate completedAt to lastActivityAt so
  // the session shows the right duration in history. autoSealed stays false.
  async seal(id: string, userId: string): Promise<ISelfWorkoutLog | null> {
    const log = await SelfWorkoutLogModel.findOne({ _id: oid(id), userId: oid(userId) });
    if (!log || log.completedAt) return log;
    if (!log.lastActivityAt) log.lastActivityAt = log.startedAt;
    log.completedAt = log.lastActivityAt;
    return log.save();
  }

  // Cron-initiated seal for sessions idle ≥ N hours. No userId scope —
  // cron iterates findStaleActive results and seals each by id.
  async autoSeal(id: string): Promise<ISelfWorkoutLog | null> {
    const log = await SelfWorkoutLogModel.findById(id);
    if (!log || log.completedAt) return log;
    if (!log.lastActivityAt) log.lastActivityAt = log.startedAt;
    log.completedAt = log.lastActivityAt;
    log.autoSealed = true;
    return log.save();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await SelfWorkoutLogModel.findOneAndDelete({ _id: oid(id), userId: oid(userId) });
    return result !== null;
  }
}
