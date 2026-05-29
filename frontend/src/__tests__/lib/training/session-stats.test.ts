import { countInWindow, lastSession } from '@/lib/training/session-stats';
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
});
