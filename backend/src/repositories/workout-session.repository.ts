import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IWorkoutSession,
  ISessionSet,
  WORKOUT_SESSION_MODEL,
} from '../database/models/workout-session.model';

export interface CreateSessionData {
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  sets: Omit<ISessionSet, 'completedAt'>[];
  loggedBy?: string | null;
}

export interface UpdateSetData {
  actualWeight: number | null;
  actualReps: number | null;
}

export interface CompleteSessionData {
  rpe?: number | null;
  memberNote?: string | null;
}

@Injectable()
export class WorkoutSessionRepository {
  constructor(
    @InjectModel(WORKOUT_SESSION_MODEL)
    private readonly model: Model<IWorkoutSession>,
  ) {}

  async create(data: CreateSessionData): Promise<IWorkoutSession> {
    const doc = new this.model({
      memberId: new Types.ObjectId(data.memberId),
      memberPlanId: new Types.ObjectId(data.memberPlanId),
      dayNumber: data.dayNumber,
      dayName: data.dayName,
      startedAt: data.startedAt,
      completedAt: null,
      lastActivityAt: data.startedAt,
      autoSealed: false,
      sets: data.sets,
      loggedBy: data.loggedBy ? new Types.ObjectId(data.loggedBy) : null,
    });
    return doc.save();
  }

  async findById(id: string): Promise<IWorkoutSession | null> {
    return this.model.findById(id);
  }

  async findByMember(
    memberId: string,
    limit?: number,
  ): Promise<IWorkoutSession[]> {
    const query = this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ startedAt: -1 });
    return limit ? query.limit(limit) : query;
  }

  async findActive(memberId: string): Promise<IWorkoutSession | null> {
    return this.model
      .findOne({ memberId: new Types.ObjectId(memberId), completedAt: null })
      .sort({ startedAt: -1 });
  }

  async findCompletedToday(memberId: string): Promise<IWorkoutSession | null> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return this.model
      .findOne({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $gte: start, $lt: end },
      })
      .sort({ completedAt: -1 });
  }

  async updateSet(
    id: string,
    setIndex: number,
    data: UpdateSetData,
  ): Promise<IWorkoutSession | null> {
    const now = new Date();
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: data.actualWeight,
          [`sets.${setIndex}.actualReps`]: data.actualReps,
          [`sets.${setIndex}.completedAt`]: now,
          lastActivityAt: now,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async complete(
    id: string,
    data?: CompleteSessionData,
  ): Promise<IWorkoutSession | null> {
    const now = new Date();
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          completedAt: now,
          lastActivityAt: now,
          rpe: data?.rpe ?? null,
          memberNote: data?.memberNote ?? null,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async seal(id: string): Promise<IWorkoutSession | null> {
    const sess = await this.model.findById(id);
    if (!sess || sess.completedAt) return sess;
    sess.completedAt = sess.lastActivityAt;
    return sess.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }

  async findStaleActive(staleAfterHours: number): Promise<IWorkoutSession[]> {
    const cutoff = new Date(Date.now() - staleAfterHours * 60 * 60 * 1000);
    return this.model.find({
      completedAt: null,
      lastActivityAt: { $lt: cutoff },
    });
  }

  async autoSeal(id: string): Promise<{ autoSealed: boolean } | null> {
    const sess = await this.model.findById(id);
    if (!sess || sess.completedAt) return null;
    sess.completedAt = sess.lastActivityAt;
    sess.autoSealed = true;
    await sess.save();
    return { autoSealed: true };
  }

  async findByDateRange(
    memberId: string,
    start: Date,
    end: Date,
  ): Promise<IWorkoutSession[]> {
    return this.model
      .find({
        memberId: new Types.ObjectId(memberId),
        startedAt: { $gte: start, $lt: end },
      })
      .sort({ startedAt: 1 });
  }
}
