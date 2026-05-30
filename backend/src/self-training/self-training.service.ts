import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { SelfPersonalBestRepository } from '../repositories/self-personal-best.repository';
import type {
  ISelfWorkoutLog,
  ISelfWorkoutSet,
} from '../database/models/self-workout-log.model';
import type { CreateSelfWorkoutLogData } from '../repositories/self-workout-log.repository';

@Injectable()
export class SelfTrainingService {
  constructor(
    private readonly logRepo: SelfWorkoutLogRepository,
    private readonly pbRepo: SelfPersonalBestRepository,
  ) {}

  async create(
    userId: string,
    data: Omit<CreateSelfWorkoutLogData, 'userId' | 'startedAt'>,
    deleteActive: boolean,
  ): Promise<ISelfWorkoutLog> {
    const activeLog = await this.logRepo.findActive(userId);

    if (activeLog) {
      if (!deleteActive) {
        throw new ConflictException({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            _id: activeLog._id.toString(),
            dayName: activeLog.dayName,
            startedAt: activeLog.startedAt,
            setCount: activeLog.sets.filter((s) => s.completedAt !== null)
              .length,
          },
        });
      }
      await this.logRepo.delete(activeLog._id.toString(), userId);
    }

    const completedToday = await this.logRepo.findCompletedToday(userId);
    if (completedToday) {
      throw new ConflictException({
        error: 'DAY_ALREADY_LOGGED',
        session: {
          _id: completedToday._id.toString(),
          dayName: completedToday.dayName,
        },
      });
    }

    return this.logRepo.create({
      userId,
      startedAt: new Date(),
      ...data,
    });
  }

  async list(
    userId: string,
    year: number,
    month: number,
  ): Promise<ISelfWorkoutLog[]> {
    return this.logRepo.findByUserMonth(userId, year, month);
  }

  async getActive(userId: string): Promise<ISelfWorkoutLog | null> {
    return this.logRepo.findActive(userId);
  }

  async getRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<
    {
      _id: string;
      dayName: string;
      startedAt: string;
      completedAt: string | null;
      setCount: number;
      rpe: number | null;
    }[]
  > {
    const logs = await this.logRepo.findByUserDateRange(userId, start, end);
    return logs.map((l) => ({
      _id: l._id.toString(),
      dayName: l.dayName,
      startedAt: l.startedAt.toISOString(),
      completedAt: l.completedAt ? l.completedAt.toISOString() : null,
      setCount: l.sets.length,
      rpe: l.rpe,
    }));
  }

  async getById(id: string, userId: string): Promise<ISelfWorkoutLog> {
    const log = await this.logRepo.findById(id, userId);
    if (!log) throw new NotFoundException('Not found');
    return log;
  }

  async delete(id: string, userId: string): Promise<void> {
    const ok = await this.logRepo.delete(id, userId);
    if (!ok) throw new NotFoundException('Not found');
  }

  async addSet(
    id: string,
    userId: string,
    set: ISelfWorkoutSet,
  ): Promise<ISelfWorkoutLog | null> {
    return this.logRepo.appendSet(id, userId, set);
  }

  async updateSet(
    id: string,
    userId: string,
    setIndex: number,
    patch: { actualWeight: number | null; actualReps: number | null },
  ): Promise<ISelfWorkoutLog> {
    const log = await this.logRepo.updateSet(id, userId, setIndex, patch);
    if (!log) throw new NotFoundException('Not found');
    return log;
  }

  async complete(
    id: string,
    userId: string,
    rpe: number | null,
    note: string | null,
  ): Promise<ISelfWorkoutLog | null> {
    const log = await this.logRepo.complete(id, userId, rpe, note);
    if (!log) return null;

    // Recompute self PBs — pick heaviest set per exercise by Epley 1RM
    const heaviest = new Map<
      string,
      { weight: number; reps: number; exerciseName: string }
    >();
    for (const s of log.sets) {
      if (s.actualWeight == null || s.actualReps == null) continue;
      const key = s.exerciseId.toString();
      const cur = heaviest.get(key);
      const candidate = {
        weight: s.actualWeight,
        reps: s.actualReps,
        exerciseName: s.exerciseName,
      };
      const candidateOrm = candidate.weight * (1 + candidate.reps / 30);
      const curOrm = cur ? cur.weight * (1 + cur.reps / 30) : -Infinity;
      if (candidateOrm > curOrm) {
        heaviest.set(key, candidate);
      }
    }

    await Promise.all(
      Array.from(heaviest.entries()).map(([exerciseId, set]) =>
        this.pbRepo.upsertIfBetter({
          userId,
          exerciseId,
          exerciseName: set.exerciseName,
          weight: set.weight,
          reps: set.reps,
          logId: id,
        }),
      ),
    );

    return log;
  }

  async seal(id: string, userId: string): Promise<ISelfWorkoutLog | null> {
    return this.logRepo.seal(id, userId);
  }

  validateDayName(dayName: unknown): asserts dayName is string {
    if (!dayName || typeof dayName !== 'string') {
      throw new BadRequestException('dayName is required');
    }
  }
}
