/** @jest-environment node */
jest.mock('@/lib/db/models/self-workout-log.model', () => ({
  SelfWorkoutLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    findById: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

const mockModel = jest.mocked(SelfWorkoutLogModel) as jest.MockedFunction<typeof SelfWorkoutLogModel> & {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
  findById: jest.Mock;
};

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439099';
const LOG_ID = '507f1f77bcf86cd799439020';
const EX_ID = '507f1f77bcf86cd799439030';

const sampleSet: ISelfWorkoutSet = {
  exerciseId: new mongoose.Types.ObjectId(EX_ID),
  exerciseName: 'Bench Press',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 5,
  prescribedRepsMax: 8,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
};

describe('MongoSelfWorkoutLogRepository', () => {
  let repo: MongoSelfWorkoutLogRepository;
  let saveSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoSelfWorkoutLogRepository();
    saveSpy = jest.fn().mockResolvedValue({ _id: LOG_ID });
    (mockModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveSpy }));
  });

  describe('create', () => {
    it('constructs a doc with userId converted to ObjectId, lastActivityAt = startedAt, autoSealed = false', async () => {
      const startedAt = new Date('2026-05-08');
      await repo.create({
        userId: USER_A,
        startedAt,
        sourceTemplateId: null,
        sourceTemplateDayNumber: null,
        dayName: 'Freestyle',
        sets: [sampleSet],
      });
      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new mongoose.Types.ObjectId(USER_A),
          dayName: 'Freestyle',
          lastActivityAt: startedAt,
          autoSealed: false,
        }),
      );
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('scopes by userId so user B cannot read user A logs', async () => {
      mockModel.findOne.mockResolvedValue({ _id: LOG_ID } as never);
      const result = await repo.findById(LOG_ID, USER_B);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_B),
      });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findActive', () => {
    it('returns the latest open log scoped to userId', async () => {
      const sortFn = jest.fn().mockResolvedValue({ _id: LOG_ID });
      mockModel.findOne.mockReturnValue({ sort: sortFn } as never);
      const result = await repo.findActive(USER_A);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: new mongoose.Types.ObjectId(USER_A),
        completedAt: null,
      });
      expect(sortFn).toHaveBeenCalledWith({ startedAt: -1 });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findByUserMonth', () => {
    it('queries with userId and a month range', async () => {
      const sortFn = jest.fn().mockResolvedValue([{ _id: LOG_ID }]);
      mockModel.find.mockReturnValue({ sort: sortFn } as never);
      await repo.findByUserMonth(USER_A, 2026, 5);
      const arg = mockModel.find.mock.calls[0][0] as { userId: unknown; completedAt: { $gte: Date; $lt: Date } };
      expect(arg.userId).toEqual(new mongoose.Types.ObjectId(USER_A));
      expect(arg.completedAt.$gte).toEqual(new Date(2026, 4, 1));
      expect(arg.completedAt.$lt).toEqual(new Date(2026, 5, 1));
    });
  });

  describe('appendSet', () => {
    it('uses $push, bumps lastActivityAt, and scopes by userId', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.appendSet(LOG_ID, USER_A, sampleSet);
      const call = mockModel.findOneAndUpdate.mock.calls[0];
      expect(call[0]).toEqual({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
      });
      expect(call[1].$push).toEqual({ sets: sampleSet });
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('updateSet', () => {
    it('patches a set, bumps lastActivityAt, scopes by userId, stamps completedAt server-side', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.updateSet(LOG_ID, USER_A, 0, { actualWeight: 100, actualReps: 5 });
      const call = mockModel.findOneAndUpdate.mock.calls[0];
      expect(call[0]).toEqual({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
      });
      expect(call[1].$set['sets.0.actualWeight']).toBe(100);
      expect(call[1].$set['sets.0.actualReps']).toBe(5);
      expect(call[1].$set['sets.0.completedAt']).toBeInstanceOf(Date);
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('complete', () => {
    it('sets completedAt + lastActivityAt + rpe + note and scopes by userId', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.complete(LOG_ID, USER_A, 8, 'felt strong');
      const call = mockModel.findOneAndUpdate.mock.calls[0];
      expect(call[0]).toMatchObject({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
      });
      expect(call[1].$set).toMatchObject({ rpe: 8, note: 'felt strong' });
      expect(call[1].$set.completedAt).toBeInstanceOf(Date);
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('findStaleActive', () => {
    it('queries for incomplete logs whose lastActivityAt < cutoff', async () => {
      mockModel.find.mockResolvedValue([{ _id: LOG_ID }] as never);
      const before = Date.now();
      await repo.findStaleActive(24);
      const arg = mockModel.find.mock.calls[0][0] as { completedAt: null; lastActivityAt: { $lt: Date } };
      expect(arg.completedAt).toBeNull();
      const cutoffMs = arg.lastActivityAt.$lt.getTime();
      // 24 hour cutoff (allow a couple-second slop for the wall clock)
      expect(before - cutoffMs).toBeGreaterThanOrEqual(24 * 3600_000 - 5000);
      expect(before - cutoffMs).toBeLessThanOrEqual(24 * 3600_000 + 5000);
    });
  });

  describe('seal', () => {
    it('backdates completedAt to lastActivityAt; autoSealed stays false', async () => {
      const lastAct = new Date('2026-05-09T18:00:00Z');
      const saveSpy = jest.fn().mockResolvedValue({ _id: LOG_ID });
      mockModel.findOne.mockResolvedValue({
        _id: LOG_ID,
        completedAt: null,
        lastActivityAt: lastAct,
        autoSealed: false,
        save: saveSpy,
      } as never);
      await repo.seal(LOG_ID, USER_A);
      const obj = saveSpy.mock.instances[0] as { completedAt: Date; autoSealed: boolean };
      expect(obj.completedAt).toEqual(lastAct);
      expect(obj.autoSealed).toBe(false);
    });

    it('is idempotent — already-completed logs are returned untouched', async () => {
      const completedAt = new Date('2026-05-08T10:00:00Z');
      const saveSpy = jest.fn();
      mockModel.findOne.mockResolvedValue({
        _id: LOG_ID,
        completedAt,
        lastActivityAt: completedAt,
        autoSealed: false,
        save: saveSpy,
      } as never);
      const result = await repo.seal(LOG_ID, USER_A);
      expect(saveSpy).not.toHaveBeenCalled();
      expect((result as unknown as { completedAt: Date }).completedAt).toEqual(completedAt);
    });

  });

  describe('autoSeal', () => {
    it('flags autoSealed=true and sets completedAt = lastActivityAt', async () => {
      const lastAct = new Date('2026-05-09T18:00:00Z');
      const saveSpy = jest.fn().mockResolvedValue({ _id: LOG_ID });
      mockModel.findById.mockResolvedValue({
        _id: LOG_ID,
        completedAt: null,
        lastActivityAt: lastAct,
        autoSealed: false,
        save: saveSpy,
      } as never);
      await repo.autoSeal(LOG_ID);
      const obj = saveSpy.mock.instances[0] as { completedAt: Date; autoSealed: boolean };
      expect(obj.completedAt).toEqual(lastAct);
      expect(obj.autoSealed).toBe(true);
    });

    it('skips already-completed logs', async () => {
      const saveSpy = jest.fn();
      mockModel.findById.mockResolvedValue({
        _id: LOG_ID,
        completedAt: new Date(),
        lastActivityAt: new Date(),
        save: saveSpy,
      } as never);
      await repo.autoSeal(LOG_ID);
      expect(saveSpy).not.toHaveBeenCalled();
    });

  });

  describe('delete', () => {
    it('uses findOneAndDelete scoped by userId', async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.delete(LOG_ID, USER_A);
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
      });
    });
  });

  describe('findToday', () => {
    it('calls findOne with userId and today UTC date range', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      await repo.findToday(USER_A);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: expect.any(mongoose.Types.ObjectId),
        startedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
      });
      const args = mockModel.findOne.mock.calls[0][0] as {
        startedAt: { $gte: Date; $lt: Date };
      };
      expect(args.startedAt.$lt.getTime() - args.startedAt.$gte.getTime()).toBe(86_400_000);
      expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    });

    it('returns null when no log exists today', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const result = await repo.findToday(USER_A);
      expect(result).toBeNull();
    });

    it('returns the log when one exists today', async () => {
      const log = { _id: 'log1', dayName: 'Push', startedAt: new Date() };
      const sortMock = jest.fn().mockResolvedValue(log);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const result = await repo.findToday(USER_A);
      expect(result).toEqual(log);
    });
  });
});
