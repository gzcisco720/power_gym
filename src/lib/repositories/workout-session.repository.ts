import mongoose from 'mongoose';
import type { IWorkoutSession, ISessionSet } from '@/lib/db/models/workout-session.model';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';
import { estimatedOneRM } from '@/lib/training/epley';

export interface CreateSessionData {
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  sets: Omit<ISessionSet, 'completedAt'>[];
  loggedBy?: string | null;
}

export interface CompleteSessionData {
  rpe?: number | null;
  memberNote?: string | null;
}

export interface UpdateSetData {
  actualWeight: number | null;
  actualReps: number | null;
}

export interface IWorkoutSessionRepository {
  create(data: CreateSessionData): Promise<IWorkoutSession>;
  findById(id: string): Promise<IWorkoutSession | null>;
  findByMember(memberId: string): Promise<IWorkoutSession[]>;
  findActive(memberId: string): Promise<IWorkoutSession | null>;
  findToday(memberId: string): Promise<IWorkoutSession | null>;
  findByMonth(memberId: string, year: number, month: number): Promise<IWorkoutSession[]>;
  findStaleActive(olderThanHours: number): Promise<IWorkoutSession[]>;
  updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null>;
  addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null>;
  complete(id: string, data?: CompleteSessionData): Promise<IWorkoutSession | null>;
  seal(id: string): Promise<IWorkoutSession | null>;
  autoSeal(id: string): Promise<IWorkoutSession | null>;
  delete(id: string): Promise<boolean>;
  countByMemberIdsSince(memberIds: string[], since: Date): Promise<number>;
  findCompletedDates(memberId: string, since: Date): Promise<Date[]>;
  findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]>;
  findExerciseHistory(memberId: string, exerciseId: string): Promise<{ date: Date; estimatedOneRM: number }[]>;
  findMemberStats(memberId: string): Promise<{
    completedCount: number;
    lastCompletedAt: Date | null;
  }>;
}

export class MongoWorkoutSessionRepository implements IWorkoutSessionRepository {
  async create(data: CreateSessionData): Promise<IWorkoutSession> {
    const session = new WorkoutSessionModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      memberPlanId: new mongoose.Types.ObjectId(data.memberPlanId),
      dayNumber: data.dayNumber,
      dayName: data.dayName,
      startedAt: data.startedAt,
      completedAt: null,
      lastActivityAt: data.startedAt,
      autoSealed: false,
      sets: data.sets,
      loggedBy: data.loggedBy ? new mongoose.Types.ObjectId(data.loggedBy) : null,
    });
    return session.save();
  }

  async findById(id: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findById(id);
  }

  async findByMember(memberId: string): Promise<IWorkoutSession[]> {
    return WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ startedAt: -1 });
  }

  async findActive(memberId: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      completedAt: null,
    }).sort({ startedAt: -1 });
  }

  async findToday(memberId: string): Promise<IWorkoutSession | null> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return WorkoutSessionModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      startedAt: { $gte: start, $lt: end },
    }).sort({ startedAt: -1 });
  }

  async updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null> {
    const now = new Date();
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: data.actualWeight,
          [`sets.${setIndex}.actualReps`]: data.actualReps,
          [`sets.${setIndex}.completedAt`]: now,
          lastActivityAt: now,
        },
      },
      { new: true },
    );
  }

  async addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      { $push: { sets: extraSet }, $set: { lastActivityAt: new Date() } },
      { new: true },
    );
  }

  async complete(id: string, data?: CompleteSessionData): Promise<IWorkoutSession | null> {
    const now = new Date();
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          completedAt: now,
          lastActivityAt: now,
          rpe: data?.rpe ?? null,
          memberNote: data?.memberNote ?? null,
        },
      },
      { new: true },
    );
  }

  async findStaleActive(olderThanHours: number): Promise<IWorkoutSession[]> {
    const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
    return WorkoutSessionModel.find({
      completedAt: null,
      lastActivityAt: { $lt: cutoff },
    });
  }

  // User-initiated cross-day save: backdate completedAt to lastActivityAt.
  async seal(id: string): Promise<IWorkoutSession | null> {
    const sess = await WorkoutSessionModel.findById(id);
    if (!sess || sess.completedAt) return sess;
    sess.completedAt = sess.lastActivityAt;
    return sess.save();
  }

  // Cron-initiated seal for sessions idle ≥ N hours.
  async autoSeal(id: string): Promise<IWorkoutSession | null> {
    const sess = await WorkoutSessionModel.findById(id);
    if (!sess || sess.completedAt) return sess;
    sess.completedAt = sess.lastActivityAt;
    sess.autoSealed = true;
    return sess.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await WorkoutSessionModel.findByIdAndDelete(id);
    return result !== null;
  }

  async findByMonth(memberId: string, year: number, month: number): Promise<IWorkoutSession[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      completedAt: { $gte: start, $lt: end },
    }).sort({ completedAt: 1 });
  }

  async countByMemberIdsSince(memberIds: string[], since: Date): Promise<number> {
    return WorkoutSessionModel.countDocuments({
      memberId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) },
      completedAt: { $gte: since },
    });
  }

  async findCompletedDates(memberId: string, since: Date): Promise<Date[]> {
    const sessions = await WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      completedAt: { $gte: since },
    }).select('completedAt');
    return sessions.map((s) => s.completedAt!);
  }

  async findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]> {
    const results = await WorkoutSessionModel.aggregate<{ _id: mongoose.Types.ObjectId; exerciseName: string }>([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId) } },
      { $unwind: '$sets' },
      { $match: { 'sets.actualWeight': { $ne: null }, 'sets.actualReps': { $ne: null } } },
      { $group: { _id: '$sets.exerciseId', exerciseName: { $first: '$sets.exerciseName' } } },
      { $sort: { exerciseName: 1 } },
    ]);
    return results.map((r) => ({ exerciseId: r._id.toString(), exerciseName: r.exerciseName }));
  }

  async findExerciseHistory(
    memberId: string,
    exerciseId: string,
  ): Promise<{ date: Date; estimatedOneRM: number }[]> {
    const sessions = await WorkoutSessionModel.find(
      {
        memberId: new mongoose.Types.ObjectId(memberId),
        completedAt: { $ne: null },
        'sets.exerciseId': new mongoose.Types.ObjectId(exerciseId),
      },
      { completedAt: 1, sets: 1 },
    ).sort({ completedAt: 1 });

    return sessions
      .map((session) => {
        const matchingSets = session.sets.filter(
          (s) =>
            s.exerciseId.toString() === exerciseId &&
            s.actualWeight !== null &&
            s.actualReps !== null,
        );
        if (matchingSets.length === 0) return null;
        const maxOneRM = Math.max(
          ...matchingSets.map((s) => estimatedOneRM(s.actualWeight!, s.actualReps!)),
        );
        return { date: session.completedAt!, estimatedOneRM: Math.round(maxOneRM * 10) / 10 };
      })
      .filter((entry): entry is { date: Date; estimatedOneRM: number } => entry !== null);
  }

  async findMemberStats(memberId: string): Promise<{
    completedCount: number;
    lastCompletedAt: Date | null;
  }> {
    const results = await WorkoutSessionModel.aggregate<{
      completedCount: number;
      lastCompletedAt: Date | null;
    }>([
      {
        $match: {
          memberId: new mongoose.Types.ObjectId(memberId),
          completedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          completedCount: { $sum: 1 },
          lastCompletedAt: { $max: '$completedAt' },
        },
      },
    ]);

    if (results.length === 0) {
      return { completedCount: 0, lastCompletedAt: null };
    }
    return {
      completedCount: results[0].completedCount,
      lastCompletedAt: results[0].lastCompletedAt,
    };
  }
}
