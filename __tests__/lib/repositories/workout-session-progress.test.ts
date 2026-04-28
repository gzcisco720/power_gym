/** @jest-environment node */

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

const mockModel = jest.mocked(WorkoutSessionModel);
const mockFind = mockModel.find as jest.Mock;
const mockAggregate = mockModel.aggregate as jest.Mock;

const MEMBER_ID = '507f1f77bcf86cd799439011';
const EXERCISE_ID = '507f1f77bcf86cd799439012';

describe('MongoWorkoutSessionRepository — progress methods', () => {
  let repo: MongoWorkoutSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoWorkoutSessionRepository();
  });

  // ── findCompletedDates ──────────────────────────────────────────────────

  describe('findCompletedDates', () => {
    it('returns completedAt values from matching sessions', async () => {
      const since = new Date('2026-01-01');
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-03-15');
      mockFind.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ completedAt: date1 }, { completedAt: date2 }]),
      });

      const result = await repo.findCompletedDates(MEMBER_ID, since);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: expect.any(mongoose.Types.ObjectId),
          completedAt: { $gte: since, $ne: null },
        }),
      );
      expect(result).toEqual([date1, date2]);
    });

    it('returns empty array when no sessions match', async () => {
      mockFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      const result = await repo.findCompletedDates(MEMBER_ID, new Date());

      expect(result).toEqual([]);
    });
  });

  // ── findTrainedExercises ────────────────────────────────────────────────

  describe('findTrainedExercises', () => {
    it('returns mapped exerciseId and exerciseName from aggregate', async () => {
      const objectId = new mongoose.Types.ObjectId(EXERCISE_ID);
      mockAggregate.mockResolvedValue([{ _id: objectId, exerciseName: 'Bench Press' }]);

      const result = await repo.findTrainedExercises(MEMBER_ID);

      expect(result).toEqual([{ exerciseId: EXERCISE_ID, exerciseName: 'Bench Press' }]);
    });

    it('returns empty array when aggregate returns nothing', async () => {
      mockAggregate.mockResolvedValue([]);

      const result = await repo.findTrainedExercises(MEMBER_ID);

      expect(result).toEqual([]);
    });
  });

  // ── findExerciseHistory ─────────────────────────────────────────────────

  describe('findExerciseHistory', () => {
    const exerciseObjectId = new mongoose.Types.ObjectId(EXERCISE_ID);

    it('computes max estimated 1RM per session and sorts ascending', async () => {
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-03-15');
      // Session 1: two sets for the exercise — 60 kg × 8 reps and 70 kg × 5 reps
      // Epley: 60*(1+8/30)=76, 70*(1+5/30)≈81.67 → max = 81.67 → rounded = 81.7
      // Session 2: 80 kg × 3 reps → 80*(1+3/30)=88 → rounded = 88
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: date1,
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [
              { exerciseId: exerciseObjectId, actualWeight: 60, actualReps: 8 },
              { exerciseId: exerciseObjectId, actualWeight: 70, actualReps: 5 },
            ],
          },
          {
            completedAt: date2,
            startedAt: new Date('2026-03-15T09:00:00'),
            sets: [{ exerciseId: exerciseObjectId, actualWeight: 80, actualReps: 3 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([
        { date: date1, estimatedOneRM: 81.7 },
        { date: date2, estimatedOneRM: 88 },
      ]);
    });

    it('skips sessions with no matching exercise sets', async () => {
      const otherExerciseId = new mongoose.Types.ObjectId();
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: new Date('2026-03-01'),
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [{ exerciseId: otherExerciseId, actualWeight: 60, actualReps: 8 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([]);
    });

    it('skips sets with null actualWeight or actualReps', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: new Date('2026-03-01'),
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [
              { exerciseId: exerciseObjectId, actualWeight: null, actualReps: 8 },
              { exerciseId: exerciseObjectId, actualWeight: 60, actualReps: null },
            ],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([]);
    });

    it('uses completedAt as date field', async () => {
      const completedAt = new Date('2026-03-10T15:00:00');
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt,
            startedAt: new Date('2026-03-10T09:00:00'),
            sets: [{ exerciseId: exerciseObjectId, actualWeight: 100, actualReps: 1 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result[0].date).toEqual(completedAt);
    });
  });
});
