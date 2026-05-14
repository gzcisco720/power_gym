/**
 * @jest-environment node
 */
jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: { find: jest.fn(), countDocuments: jest.fn() },
}));

import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

const MEMBER_ID = '507f1f77bcf86cd799439011';

describe('findConsecutiveStreakDays', () => {
  it('returns 0 when no sessions', async () => {
    (WorkoutSessionModel.find as jest.Mock).mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    const repo = new MongoWorkoutSessionRepository();
    expect(await repo.findConsecutiveStreakDays(MEMBER_ID)).toBe(0);
  });

  it('counts consecutive days ending today', async () => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    (WorkoutSessionModel.find as jest.Mock).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([
        { completedAt: today },
        { completedAt: yesterday },
        { completedAt: twoDaysAgo },
      ]) }),
    });
    const repo = new MongoWorkoutSessionRepository();
    expect(await repo.findConsecutiveStreakDays(MEMBER_ID)).toBe(3);
  });
});

describe('countCompletedByMemberSince', () => {
  it('returns count from countDocuments', async () => {
    (WorkoutSessionModel.countDocuments as jest.Mock).mockResolvedValue(5);
    const repo = new MongoWorkoutSessionRepository();
    const since = new Date(Date.now() - 30 * 86400000);
    expect(await repo.countCompletedByMemberSince(MEMBER_ID, since)).toBe(5);
  });
});
