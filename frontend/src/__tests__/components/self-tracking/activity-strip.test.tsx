import { render, screen } from '@testing-library/react';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';
import type { WorkoutSession } from '@/api/training';

function makeSession(completedAt: string | null): WorkoutSession {
  return {
    _id: `s-${completedAt ?? 'null'}`,
    memberId: 'u1',
    memberPlanId: 'p1',
    dayNumber: 1,
    completedAt,
    sets: [],
  };
}

/** Build an ISO string for N days ago from a fixed "today" */
function daysAgo(n: number, base = new Date('2026-05-30T12:00:00Z')): string {
  return new Date(base.getTime() - n * 86_400_000).toISOString();
}

describe('ActivityStrip', () => {
  describe('full state', () => {
    it('renders 14 day-dots and a month session count from props', () => {
      // 3 sessions on the last 3 days → 3 filled dots, all within the current month
      const sessions: WorkoutSession[] = [
        makeSession(daysAgo(0)), // today (May 30)
        makeSession(daysAgo(1)), // yesterday (May 29)
        makeSession(daysAgo(2)), // 2 days ago (May 28)
        makeSession(null),        // incomplete — should not count
      ];

      render(<ActivityStrip sessions={sessions} today={new Date('2026-05-30T12:00:00Z')} />);

      // 14 dots rendered
      const dots = document.querySelectorAll('[data-dot]');
      expect(dots).toHaveLength(14);

      // At least 3 filled dots (today, yesterday, 2 days ago)
      const filledDots = document.querySelectorAll('[data-dot="filled"]');
      expect(filledDots.length).toBeGreaterThanOrEqual(3);

      // Session count for the month: all 3 sessions are in May 2026
      expect(screen.getByText(/sessions/i)).toBeInTheDocument();
      // The count "3" appears as a separate span
      expect(screen.getByText((content) => content === '3')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders an encouraging empty message and zero filled dots', () => {
      render(<ActivityStrip sessions={[]} today={new Date('2026-05-30T12:00:00Z')} />);

      // 14 dots rendered, all empty (unfilled)
      const dots = document.querySelectorAll('[data-dot]');
      expect(dots).toHaveLength(14);

      // Zero filled dots
      const filledDots = document.querySelectorAll('[data-dot="filled"]');
      expect(filledDots).toHaveLength(0);

      // Encouraging message
      expect(screen.getByText(/log today|get started|build a streak/i)).toBeInTheDocument();
    });
  });
});
