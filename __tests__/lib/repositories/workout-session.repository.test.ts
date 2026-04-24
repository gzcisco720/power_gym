// __tests__/lib/repositories/workout-session.repository.test.ts
import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
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

  describe('updateSet', () => {
    it('calls findByIdAndUpdate with positional set update', async () => {
      const updated = { _id: 's1' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      await repo.updateSet('s1', 2, { actualWeight: 100, actualReps: 8 });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        {
          $set: {
            'sets.2.actualWeight': 100,
            'sets.2.actualReps': 8,
            'sets.2.completedAt': expect.any(Date),
          },
        },
        { new: true },
      );
    });
  });

  describe('addExtraSet', () => {
    it('calls findByIdAndUpdate with $push', async () => {
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

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $push: { sets: extraSet } },
        { new: true },
      );
    });
  });

  describe('complete', () => {
    it('sets completedAt on the session', async () => {
      mockModel.findByIdAndUpdate.mockResolvedValue({ _id: 's1', completedAt: new Date() } as never);

      await repo.complete('s1');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $set: { completedAt: expect.any(Date) } },
        { new: true },
      );
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
});
