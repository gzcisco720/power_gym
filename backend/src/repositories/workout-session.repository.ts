import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { estimatedOneRM } from '../common/epley';

export interface ExerciseHistoryPoint {
  date: Date;
  estimatedOneRM: number;
  bestWeight: number;
  bestReps: number;
}

export interface LastWeightHint {
  exerciseId: string;
  lastWeight: number;
  lastReps: number;
  lastDate: Date;
  consecutiveMaxHits: number;
}
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

  async countByMemberIdsSince(
    memberIds: string[],
    since: Date,
  ): Promise<number> {
    if (memberIds.length === 0) return 0;
    return this.model.countDocuments({
      memberId: { $in: memberIds.map((id) => new Types.ObjectId(id)) },
      completedAt: { $gte: since },
    });
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

  async findExerciseHistory(
    memberId: string,
    exerciseId: string,
  ): Promise<ExerciseHistoryPoint[]> {
    const sessions = await this.model
      .find(
        {
          memberId: new Types.ObjectId(memberId),
          completedAt: { $ne: null },
          'sets.exerciseId': new Types.ObjectId(exerciseId),
        },
        { completedAt: 1, sets: 1 },
      )
      .sort({ completedAt: 1 });

    return sessions.flatMap((session) => {
      const matchingSets = session.sets.filter(
        (s) =>
          s.exerciseId.toString() === exerciseId &&
          s.actualWeight !== null &&
          s.actualReps !== null,
      );
      if (matchingSets.length === 0) return [];

      let bestSet = matchingSets[0];
      let bestEstimated = estimatedOneRM(
        bestSet.actualWeight!,
        bestSet.actualReps!,
      );
      for (const s of matchingSets.slice(1)) {
        const e = estimatedOneRM(s.actualWeight!, s.actualReps!);
        if (e > bestEstimated) {
          bestEstimated = e;
          bestSet = s;
        }
      }

      return [
        {
          date: session.completedAt!,
          estimatedOneRM: Math.round(bestEstimated * 10) / 10,
          bestWeight: bestSet.actualWeight!,
          bestReps: bestSet.actualReps!,
        },
      ];
    });
  }

  async findLastWeightsForExercises(
    memberId: string,
    exerciseIds: string[],
  ): Promise<LastWeightHint[]> {
    if (exerciseIds.length === 0) return [];

    const objectIds = exerciseIds.map((id) => new Types.ObjectId(id));

    type SessionGroup = {
      sessionDate: Date;
      sets: {
        actualWeight: number;
        actualReps: number;
        prescribedRepsMax: number;
      }[];
    };
    type AggResult = { _id: Types.ObjectId; sessions: SessionGroup[] };

    const results = await this.model.aggregate<AggResult>([
      {
        $match: {
          memberId: new Types.ObjectId(memberId),
          completedAt: { $ne: null },
          'sets.exerciseId': { $in: objectIds },
        },
      },
      { $sort: { completedAt: -1 } },
      { $unwind: '$sets' },
      {
        $match: {
          'sets.exerciseId': { $in: objectIds },
          'sets.actualWeight': { $ne: null, $gt: 0 },
          'sets.actualReps': { $ne: null },
        },
      },
      {
        $group: {
          _id: { exId: '$sets.exerciseId', sessionId: '$_id' },
          sessionDate: { $first: '$completedAt' },
          sets: {
            $push: {
              actualWeight: '$sets.actualWeight',
              actualReps: '$sets.actualReps',
              prescribedRepsMax: '$sets.prescribedRepsMax',
            },
          },
        },
      },
      { $sort: { '_id.exId': 1, sessionDate: -1 } },
      {
        $group: {
          _id: '$_id.exId',
          sessions: {
            $push: { sessionDate: '$sessionDate', sets: '$sets' },
          },
        },
      },
      { $project: { sessions: { $slice: ['$sessions', 2] } } },
    ]);

    return results.map((result) => {
      const latest = result.sessions[0];
      const prev = result.sessions[1];

      const maxWeightSet = latest.sets.reduce(
        (best, s) => (s.actualWeight > best.actualWeight ? s : best),
        latest.sets[0],
      );

      const lastAllHitMax = latest.sets.every(
        (s) => s.actualReps >= s.prescribedRepsMax,
      );
      const prevAllHitMax = prev
        ? prev.sets.every((s) => s.actualReps >= s.prescribedRepsMax)
        : false;
      const consecutiveMaxHits =
        lastAllHitMax && prevAllHitMax ? 2 : lastAllHitMax ? 1 : 0;

      return {
        exerciseId: result._id.toString(),
        lastWeight: maxWeightSet.actualWeight,
        lastReps: maxWeightSet.actualReps,
        lastDate: latest.sessionDate,
        consecutiveMaxHits,
      };
    });
  }
}
