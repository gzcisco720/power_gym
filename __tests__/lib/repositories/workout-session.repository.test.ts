// __tests__/lib/repositories/workout-session.repository.test.ts
import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(WorkoutSessionModel);

describe('MongoWorkoutSessionRepository', () => {
  let repo: MongoWorkoutSessionRepository;

  beforeEach(() => {
    repo = new MongoWorkoutSessionRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves and returns the session', async () => {
      const saved = { _id: 's1', dayNumber: 1 };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (WorkoutSessionModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        memberId: new mongoose.Types.ObjectId().toString(),
        memberPlanId: new mongoose.Types.ObjectId().toString(),
        dayNumber: 1,
        dayName: 'Day 1 — Push',
        startedAt: new Date(),
        sets: [],
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('findById', () => {
    it('calls findById with id', async () => {
      mockModel.findById.mockResolvedValue(null as never);
      await repo.findById('session-id');
      expect(mockModel.findById).toHaveBeenCalledWith('session-id');
    });
  });

  describe('findByMember', () => {
    it('queries by memberId sorted by startedAt desc', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findByMember(id);
      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    });
  });

  describe('findActive', () => {
    it('queries for non-completed session sorted by latest startedAt', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findActive(id);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        completedAt: null,
      });
      expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    });
  });

  describe('updateSet', () => {
    it('calls findByIdAndUpdate with positional set update + bumps lastActivityAt', async () => {
      const updated = { _id: 's1' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      await repo.updateSet('s1', 2, { actualWeight: 100, actualReps: 8 });

      const call = mockModel.findByIdAndUpdate.mock.calls[0];
      expect(call[0]).toBe('s1');
      expect(call[1].$set['sets.2.actualWeight']).toBe(100);
      expect(call[1].$set['sets.2.actualReps']).toBe(8);
      expect(call[1].$set['sets.2.completedAt']).toBeInstanceOf(Date);
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('addExtraSet', () => {
    it('calls findByIdAndUpdate with $push + bumps lastActivityAt', async () => {
      const updated = { _id: 's1' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      const extraSet = {
        exerciseId: new mongoose.Types.ObjectId(),
        exerciseName: 'Bench',
        groupId: 'A',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 4,
        prescribedRepsMin: 8,
        prescribedRepsMax: 10,
        isExtraSet: true,
        actualWeight: null,
        actualReps: null,
        completedAt: null,
      };

      await repo.addExtraSet('s1', extraSet);

      const call = mockModel.findByIdAndUpdate.mock.calls[0];
      expect(call[1].$push).toEqual({ sets: extraSet });
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('complete', () => {
    it('sets completedAt + lastActivityAt on the session', async () => {
      mockModel.findByIdAndUpdate.mockResolvedValue({ _id: 's1', completedAt: new Date() } as never);

      await repo.complete('s1');

      const call = mockModel.findByIdAndUpdate.mock.calls[0];
      expect(call[0]).toBe('s1');
      expect(call[1].$set.completedAt).toBeInstanceOf(Date);
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
      expect(call[1].$set.rpe).toBeNull();
      expect(call[1].$set.memberNote).toBeNull();
    });
  });

  describe('findStaleActive', () => {
    it('queries non-completed sessions with lastActivityAt < cutoff', async () => {
      mockModel.find.mockResolvedValue([{ _id: 's1' }] as never);
      const before = Date.now();
      await repo.findStaleActive(24);
      const arg = mockModel.find.mock.calls[0][0] as { completedAt: null; lastActivityAt: { $lt: Date } };
      expect(arg.completedAt).toBeNull();
      expect(before - arg.lastActivityAt.$lt.getTime()).toBeGreaterThanOrEqual(24 * 3600_000 - 5000);
    });
  });

  describe('seal', () => {
    it('backdates completedAt to lastActivityAt without flagging autoSealed', async () => {
      const lastAct = new Date('2026-05-09T18:00:00Z');
      const saveSpy = jest.fn().mockResolvedValue({ _id: 's1' });
      mockModel.findById.mockResolvedValue({
        _id: 's1',
        completedAt: null,
        lastActivityAt: lastAct,
        autoSealed: false,
        save: saveSpy,
      } as never);
      await repo.seal('s1');
      const obj = saveSpy.mock.instances[0] as { completedAt: Date; autoSealed: boolean };
      expect(obj.completedAt).toEqual(lastAct);
      expect(obj.autoSealed).toBe(false);
    });
  });

  describe('autoSeal', () => {
    it('sets completedAt = lastActivityAt and autoSealed=true', async () => {
      const lastAct = new Date('2026-05-09T18:00:00Z');
      const saveSpy = jest.fn().mockResolvedValue({ _id: 's1' });
      mockModel.findById.mockResolvedValue({
        _id: 's1',
        completedAt: null,
        lastActivityAt: lastAct,
        autoSealed: false,
        save: saveSpy,
      } as never);
      await repo.autoSeal('s1');
      const obj = saveSpy.mock.instances[0] as { completedAt: Date; autoSealed: boolean };
      expect(obj.completedAt).toEqual(lastAct);
      expect(obj.autoSealed).toBe(true);
    });

    it('skips already-completed sessions', async () => {
      const saveSpy = jest.fn();
      mockModel.findById.mockResolvedValue({
        _id: 's1',
        completedAt: new Date(),
        save: saveSpy,
      } as never);
      await repo.autoSeal('s1');
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('calls findByIdAndDelete', async () => {
      const mock = (WorkoutSessionModel as unknown as { findByIdAndDelete: jest.Mock }).findByIdAndDelete;
      mock.mockResolvedValue({ _id: 's1' });
      const ok = await repo.delete('s1');
      expect(mock).toHaveBeenCalledWith('s1');
      expect(ok).toBe(true);
    });
  });

  describe('countByMemberIdsSince', () => {
    it('counts completed sessions for given member IDs since date', async () => {
      mockModel.countDocuments.mockResolvedValue(7 as never);
      const since = new Date('2026-04-01');
      const memberIds = [
        '000000000000000000000001',
        '000000000000000000000002',
      ];

      const result = await repo.countByMemberIdsSince(memberIds, since);

      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        memberId: {
          $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        completedAt: { $gte: since },
      });
      expect(result).toBe(7);
    });

    it('returns 0 for empty memberIds array', async () => {
      mockModel.countDocuments.mockResolvedValue(0 as never);

      const result = await repo.countByMemberIdsSince([], new Date());

      expect(result).toBe(0);
    });
  });

  describe('findMemberStats', () => {
    it('returns completedCount and lastCompletedAt from aggregation', async () => {
      const aggMock = jest.fn().mockResolvedValue([
        { completedCount: 5, lastCompletedAt: new Date('2026-04-10') },
      ]);
      (WorkoutSessionModel as unknown as { aggregate: jest.Mock }).aggregate = aggMock;

      const result = await repo.findMemberStats('000000000000000000000001');

      expect(result.completedCount).toBe(5);
      expect(result.lastCompletedAt).toEqual(new Date('2026-04-10'));
    });

    it('returns zero count and null date when no sessions', async () => {
      const aggMock = jest.fn().mockResolvedValue([]);
      (WorkoutSessionModel as unknown as { aggregate: jest.Mock }).aggregate = aggMock;

      const result = await repo.findMemberStats('000000000000000000000001');

      expect(result.completedCount).toBe(0);
      expect(result.lastCompletedAt).toBeNull();
    });
  });

  describe('create with loggedBy', () => {
    it('passes loggedBy to the model when provided', async () => {
      const saved = { _id: 's1', loggedBy: new mongoose.Types.ObjectId().toString() };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (WorkoutSessionModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const trainerId = new mongoose.Types.ObjectId().toString();
      await repo.create({
        memberId: new mongoose.Types.ObjectId().toString(),
        memberPlanId: new mongoose.Types.ObjectId().toString(),
        dayNumber: 1,
        dayName: 'Pull Day',
        startedAt: new Date(),
        sets: [],
        loggedBy: trainerId,
      });

      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('complete with rpe and memberNote', () => {
    it('sets completedAt, lastActivityAt, rpe, and memberNote', async () => {
      const updated = { _id: 's1', completedAt: new Date(), rpe: 7, memberNote: 'Great session' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      const result = await repo.complete('s1', { rpe: 7, memberNote: 'Great session' });

      const call = mockModel.findByIdAndUpdate.mock.calls[0];
      expect(call[0]).toBe('s1');
      expect(call[1].$set.completedAt).toBeInstanceOf(Date);
      expect(call[1].$set.lastActivityAt).toBeInstanceOf(Date);
      expect(call[1].$set.rpe).toBe(7);
      expect(call[1].$set.memberNote).toBe('Great session');
      expect(result).toEqual(updated);
    });
  });

  describe('findByMonth', () => {
    it('queries sessions within a calendar month', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      await repo.findByMonth(new mongoose.Types.ObjectId().toString(), 2026, 5);

      expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({
        memberId: expect.any(mongoose.Types.ObjectId),
        completedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
      }));
    });
  });

  describe('findToday', () => {
    it('calls findOne with memberId and today UTC date range', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findToday(id);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        startedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
      });
      const args = mockModel.findOne.mock.calls[0][0] as {
        startedAt: { $gte: Date; $lt: Date };
      };
      // $lt - $gte should equal exactly 24 hours
      expect(args.startedAt.$lt.getTime() - args.startedAt.$gte.getTime()).toBe(86_400_000);
      expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    });

    it('returns null when no session exists today', async () => {
      const sortMock = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const result = await repo.findToday(new mongoose.Types.ObjectId().toString());
      expect(result).toBeNull();
    });

    it('returns the session when one exists today', async () => {
      const session = { _id: 's1', dayNumber: 1, startedAt: new Date() };
      const sortMock = jest.fn().mockResolvedValue(session);
      mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
      const result = await repo.findToday(new mongoose.Types.ObjectId().toString());
      expect(result).toEqual(session);
    });
  });
});
