import 'reflect-metadata';
import { SelfTrainingService } from './self-training.service';
import type {
  ISelfWorkoutLog,
  ISelfWorkoutSet,
} from '../database/models/self-workout-log.model';
import type { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import type { SelfPersonalBestRepository } from '../repositories/self-personal-best.repository';
import { Types } from 'mongoose';

function makeLog(overrides: Partial<ISelfWorkoutLog> = {}): ISelfWorkoutLog {
  const id = new Types.ObjectId();
  const userId = new Types.ObjectId();
  return {
    _id: id,
    userId,
    startedAt: new Date('2024-01-15T09:00:00Z'),
    completedAt: null,
    lastActivityAt: new Date('2024-01-15T09:00:00Z'),
    autoSealed: false,
    sourceTemplateId: null,
    sourceTemplateDayNumber: null,
    dayName: 'Push Day',
    sets: [],
    rpe: null,
    note: null,
    ...overrides,
  } as unknown as ISelfWorkoutLog;
}

function makeSet(overrides: Partial<ISelfWorkoutSet> = {}): ISelfWorkoutSet {
  return {
    exerciseId: new Types.ObjectId(),
    exerciseName: 'Bench Press',
    groupId: 'grp1',
    isSuperset: false,
    isBodyweight: false,
    setNumber: 1,
    prescribedRepsMin: 8,
    prescribedRepsMax: 12,
    actualWeight: null,
    actualReps: null,
    completedAt: null,
    ...overrides,
  };
}

function makeLogRepo(
  overrides: Record<string, jest.Mock> = {},
): SelfWorkoutLogRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findActive: jest.fn(),
    findCompletedToday: jest.fn(),
    findByUserMonth: jest.fn(),
    findByUserDateRange: jest.fn(),
    appendSet: jest.fn(),
    updateSet: jest.fn(),
    complete: jest.fn(),
    seal: jest.fn(),
    delete: jest.fn(),
    findStaleActive: jest.fn(),
    autoSeal: jest.fn(),
    ...overrides,
  } as unknown as SelfWorkoutLogRepository;
}

function makePbRepo(
  overrides: Record<string, jest.Mock> = {},
): SelfPersonalBestRepository {
  return {
    findByUser: jest.fn(),
    upsertIfBetter: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as SelfPersonalBestRepository;
}

describe('SelfTrainingService', () => {
  describe('getActive', () => {
    it('returns the in-progress unsealed log or null', async () => {
      const log = makeLog();
      const findActive = jest.fn().mockResolvedValue(log);
      const logRepo = makeLogRepo({ findActive });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.getActive('user1');

      expect(result).toBe(log);
      expect(findActive).toHaveBeenCalledWith('user1');
    });

    it('returns null when no active log exists', async () => {
      const logRepo = makeLogRepo({
        findActive: jest.fn().mockResolvedValue(null),
      });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.getActive('user1');

      expect(result).toBeNull();
    });
  });

  describe('addSet', () => {
    it('appends a set and updates lastActivityAt', async () => {
      const set = makeSet({ actualWeight: 80, actualReps: 10 });
      const updatedLog = makeLog({ sets: [set] });
      const appendSet = jest.fn().mockResolvedValue(updatedLog);
      const logRepo = makeLogRepo({ appendSet });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.addSet('log1', 'user1', set);

      expect(result).toBe(updatedLog);
      expect(appendSet).toHaveBeenCalledWith('log1', 'user1', set);
    });

    it('returns null when log not found', async () => {
      const logRepo = makeLogRepo({
        appendSet: jest.fn().mockResolvedValue(null),
      });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.addSet('nonexistent', 'user1', makeSet());

      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('sets completedAt and recomputes self PBs', async () => {
      const exerciseId = new Types.ObjectId();
      const logId = new Types.ObjectId();
      const completedLog = makeLog({
        _id: logId,
        completedAt: new Date(),
        sets: [
          makeSet({
            exerciseId,
            exerciseName: 'Bench Press',
            actualWeight: 100,
            actualReps: 5,
          }),
        ],
      });
      const complete = jest.fn().mockResolvedValue(completedLog);
      const upsertIfBetter = jest.fn().mockResolvedValue(true);
      const logRepo = makeLogRepo({ complete });
      const pbRepo = makePbRepo({ upsertIfBetter });
      const svc = new SelfTrainingService(logRepo, pbRepo);

      const result = await svc.complete(logId.toString(), 'user1', 7, null);

      expect(result).toBe(completedLog);
      expect(complete).toHaveBeenCalledWith(logId.toString(), 'user1', 7, null);
      expect(upsertIfBetter).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          exerciseId: exerciseId.toString(),
          exerciseName: 'Bench Press',
          weight: 100,
          reps: 5,
          logId: logId.toString(),
        }),
      );
    });

    it('skips PB upsert for sets without actualWeight or actualReps', async () => {
      const completedLog = makeLog({
        completedAt: new Date(),
        sets: [makeSet({ actualWeight: null, actualReps: null })],
      });
      const complete = jest.fn().mockResolvedValue(completedLog);
      const upsertIfBetter = jest.fn().mockResolvedValue(true);
      const logRepo = makeLogRepo({ complete });
      const pbRepo = makePbRepo({ upsertIfBetter });
      const svc = new SelfTrainingService(logRepo, pbRepo);

      await svc.complete('log1', 'user1', null, null);

      expect(upsertIfBetter).not.toHaveBeenCalled();
    });

    it('returns null when log not found', async () => {
      const logRepo = makeLogRepo({
        complete: jest.fn().mockResolvedValue(null),
      });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.complete('nonexistent', 'user1', null, null);

      expect(result).toBeNull();
    });
  });

  describe('seal', () => {
    it('marks autoSealed and blocks further edits', async () => {
      const sealedLog = makeLog({ completedAt: new Date(), autoSealed: false });
      const seal = jest.fn().mockResolvedValue(sealedLog);
      const logRepo = makeLogRepo({ seal });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.seal('log1', 'user1');

      expect(result).toBe(sealedLog);
      expect(seal).toHaveBeenCalledWith('log1', 'user1');
    });

    it('returns null when log not found', async () => {
      const logRepo = makeLogRepo({ seal: jest.fn().mockResolvedValue(null) });
      const svc = new SelfTrainingService(logRepo, makePbRepo());

      const result = await svc.seal('nonexistent', 'user1');

      expect(result).toBeNull();
    });
  });
});
