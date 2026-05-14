import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(WorkoutSessionModel);

describe('MongoWorkoutSessionRepository — trainer hub methods', () => {
  let repo: MongoWorkoutSessionRepository;
  beforeEach(() => {
    repo = new MongoWorkoutSessionRepository();
    jest.clearAllMocks();
  });

  const validId1 = new mongoose.Types.ObjectId().toHexString();
  const validId2 = new mongoose.Types.ObjectId().toHexString();

  describe('countByMemberIdsByMonth', () => {
    it('returns array of 6 month buckets with counts', async () => {
      mockModel.aggregate.mockResolvedValue([
        { _id: { year: 2026, month: 5 }, count: 34 },
      ] as never);
      const result = await repo.countByMemberIdsByMonth([validId1], 6);
      expect(result).toHaveLength(6);
      expect(result[5].count).toBe(34); // current month is last
      expect(result[0].count).toBe(0); // empty months fill with 0
    });

    it('returns empty counts when no sessions', async () => {
      mockModel.aggregate.mockResolvedValue([] as never);
      const result = await repo.countByMemberIdsByMonth([validId1], 6);
      expect(result).toHaveLength(6);
      result.forEach((r) => expect(r.count).toBe(0));
    });
  });

  describe('countActiveMembersSince', () => {
    it('returns count of distinct members with completed sessions', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      mockModel.distinct.mockResolvedValue([id1, id2] as never);
      const result = await repo.countActiveMembersSince([validId1, validId2], new Date());
      expect(result).toBe(2);
    });

    it('returns 0 when no active members', async () => {
      mockModel.distinct.mockResolvedValue([] as never);
      const result = await repo.countActiveMembersSince([], new Date());
      expect(result).toBe(0);
    });
  });

  describe('findRecentCompletedByMemberIds', () => {
    it('returns mapped objects with memberId, dayName, completedAt', async () => {
      const mid = new mongoose.Types.ObjectId();
      const date = new Date('2026-05-10');
      const chainMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ memberId: mid, dayName: 'Day 3', completedAt: date }]),
      };
      mockModel.find.mockReturnValue(chainMock as never);
      const result = await repo.findRecentCompletedByMemberIds([validId1], 5);
      expect(result).toEqual([{ memberId: mid.toString(), dayName: 'Day 3', completedAt: date }]);
    });
  });
});
