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
  completedAt: Date;
}

export interface ISelfWorkoutLogRepository {
  create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog>;
  findById(id: string, userId: string): Promise<ISelfWorkoutLog | null>;
  findActive(userId: string): Promise<ISelfWorkoutLog | null>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]>;
  appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null>;
  updateSet(id: string, userId: string, setIndex: number, patch: UpdateSelfSetData): Promise<ISelfWorkoutLog | null>;
  complete(id: string, userId: string, rpe: number | null, note: string | null): Promise<ISelfWorkoutLog | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);

export class MongoSelfWorkoutLogRepository implements ISelfWorkoutLogRepository {
  async create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog> {
    const doc = new SelfWorkoutLogModel({
      userId: oid(data.userId),
      startedAt: data.startedAt,
      completedAt: null,
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

  async findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return SelfWorkoutLogModel.find({
      userId: oid(userId),
      completedAt: { $gte: start, $lt: end },
    }).sort({ completedAt: 1 });
  }

  async appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $push: { sets: set } },
      { new: true },
    );
  }

  async updateSet(
    id: string,
    userId: string,
    setIndex: number,
    patch: UpdateSelfSetData,
  ): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: patch.actualWeight,
          [`sets.${setIndex}.actualReps`]: patch.actualReps,
          [`sets.${setIndex}.completedAt`]: patch.completedAt,
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
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $set: { completedAt: new Date(), rpe, note } },
      { new: true },
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await SelfWorkoutLogModel.findOneAndDelete({ _id: oid(id), userId: oid(userId) });
    return result !== null;
  }
}
