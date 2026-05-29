import { countInWindow, lastSession, frequencyBuckets } from '@/lib/training/session-stats';
import type { WorkoutSession } from '@/api/training';

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'sess-1',
    memberId: 'member-1',
    memberPlanId: 'plan-1',
    dayNumber: 1,
    completedAt: new Date().toISOString(),
    sets: [],
    ...overrides,
  };
}

const now = new Date('2026-05-30T12:00:00Z');

describe('session-stats', () => {
  describe('countInWindow', () => {
    it('counts only completed sessions within the last N days', () => {
      const eightDaysAgo = new Date(now);
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const ninetyOneDaysAgo = new Date(now);
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const sessions: WorkoutSession[] = [
        makeSession({ _id: 's1', completedAt: now.toISOString() }),
        makeSession({ _id: 's2', completedAt: eightDaysAgo.toISOString() }),
        makeSession({ _id: 's3', completedAt: ninetyOneDaysAgo.toISOString() }), // outside window
        makeSession({ _id: 's4', completedAt: null }), // not completed
      ];

      expect(countInWindow(sessions, 90, now)).toBe(2);
    });

    it('returns 0 when there are no sessions', () => {
      expect(countInWindow([], 90, now)).toBe(0);
    });

    it('excludes sessions with null completedAt', () => {
      const sessions: WorkoutSession[] = [
        makeSession({ _id: 's1', completedAt: null }),
        makeSession({ _id: 's2', completedAt: null }),
      ];
      expect(countInWindow(sessions, 90, now)).toBe(0);
    });
  });

  describe('lastSession', () => {
    it('returns the most recent completed session', () => {
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const sessions: WorkoutSession[] = [
        makeSession({ _id: 's1', completedAt: fiveDaysAgo.toISOString() }),
        makeSession({ _id: 's2', completedAt: twoDaysAgo.toISOString() }),
        makeSession({ _id: 's3', completedAt: null }),
      ];

      const result = lastSession(sessions);
      expect(result?._id).toBe('s2');
    });

    it('returns null when there are no completed sessions', () => {
      const sessions: WorkoutSession[] = [
        makeSession({ _id: 's1', completedAt: null }),
      ];
      expect(lastSession(sessions)).toBeNull();
    });

    it('returns null for an empty array', () => {
      expect(lastSession([])).toBeNull();
    });
  });

  describe('frequencyBuckets', () => {
    it('maps completed sessions to per-week counts over the trailing 14 weeks', () => {
      // Reference: 2026-05-30 (Saturday)
      // Week containing 2026-05-26 (Monday) → 2026-06-01 is the most recent week
      // Put 2 sessions in the current week and 1 session 7 days ago (previous week)
      const ref = new Date('2026-05-30T12:00:00Z');
      const currentWeekDate = new Date('2026-05-28T10:00:00Z'); // this week
      const prevWeekDate = new Date('2026-05-21T10:00:00Z');    // 1 week back
      const oldWeekDate = new Date('2026-05-07T10:00:00Z');     // 3 weeks back

      const sessions: WorkoutSession[] = [
        makeSession({ _id: 's1', completedAt: currentWeekDate.toISOString() }),
        makeSession({ _id: 's2', completedAt: currentWeekDate.toISOString() }),
        makeSession({ _id: 's3', completedAt: prevWeekDate.toISOString() }),
        makeSession({ _id: 's4', completedAt: oldWeekDate.toISOString() }),
        makeSession({ _id: 's5', completedAt: null }), // not completed
      ];

      const buckets = frequencyBuckets(sessions, ref);

      expect(buckets).toHaveLength(14);
      // Most recent bucket (last in array) should have 2
      expect(buckets[13].count).toBe(2);
      // Second-to-last bucket should have 1
      expect(buckets[12].count).toBe(1);
      // 3 weeks back should have 1
      expect(buckets[10].count).toBe(1);
    });

    it('returns all-zero buckets when there are no sessions', () => {
      const ref = new Date('2026-05-30T12:00:00Z');
      const buckets = frequencyBuckets([], ref);

      expect(buckets).toHaveLength(14);
      expect(buckets.every((b) => b.count === 0)).toBe(true);
    });
  });
});
