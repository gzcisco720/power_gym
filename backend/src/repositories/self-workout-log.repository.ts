import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ISelfWorkoutLog,
  ISelfWorkoutSet,
  SELF_WORKOUT_LOG_MODEL,
} from '../database/models/self-workout-log.model';

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

const oid = (s: string) => new Types.ObjectId(s);

@Injectable()
export class SelfWorkoutLogRepository {
  constructor(
    @InjectModel(SELF_WORKOUT_LOG_MODEL)
    private readonly model: Model<ISelfWorkoutLog>,
  ) {}

  async create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog> {
    const doc = new this.model({
      userId: oid(data.userId),
      startedAt: data.startedAt,
      completedAt: null,
      lastActivityAt: data.startedAt,
      autoSealed: false,
      sourceTemplateId: data.sourceTemplateId
        ? oid(data.sourceTemplateId)
        : null,
      sourceTemplateDayNumber: data.sourceTemplateDayNumber,
      dayName: data.dayName,
      sets: data.sets,
      rpe: null,
      note: null,
    });
    return doc.save();
  }

  async findById(id: string, userId: string): Promise<ISelfWorkoutLog | null> {
    return this.model.findOne({ _id: oid(id), userId: oid(userId) });
  }

  async findActive(userId: string): Promise<ISelfWorkoutLog | null> {
    return this.model
      .findOne({ userId: oid(userId), completedAt: null })
      .sort({ startedAt: -1 });
  }

  async findCompletedToday(userId: string): Promise<ISelfWorkoutLog | null> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return this.model
      .findOne({
        userId: oid(userId),
        completedAt: { $gte: start, $lt: end },
      })
      .sort({ completedAt: -1 });
  }

  async updateSet(
    id: string,
    userId: string,
    setIndex: number,
    patch: UpdateSelfSetData,
  ): Promise<ISelfWorkoutLog | null> {
    const now = new Date();
    return this.model.findOneAndUpdate(
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
    return this.model.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $set: { completedAt: now, lastActivityAt: now, rpe, note } },
      { new: true },
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({
      _id: oid(id),
      userId: oid(userId),
    });
    return result !== null;
  }
}
