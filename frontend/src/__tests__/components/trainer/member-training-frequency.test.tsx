import { render, screen } from '@testing-library/react';
import type { WorkoutSession } from '@/api/training';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    m: {
      ...actual.m,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

import { MemberTrainingFrequency } from '@/components/trainer/member-training-frequency';

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'sess-1',
    memberId: 'member-1',
    memberPlanId: 'plan-1',
    dayNumber: 1,
    completedAt: new Date('2026-05-28T10:00:00Z').toISOString(),
    sets: [],
    ...overrides,
  };
}

describe('MemberTrainingFrequency', () => {
  describe('renders', () => {
    it('renders 14 week cells and applies an intensity class to weeks with sessions', () => {
      // Use a fixed reference date so buckets are deterministic
      const ref = new Date('2026-05-30T12:00:00Z');
      // Session in current week (2026-05-28 is a Thursday → same week Monday 2026-05-25)
      const sessions = [
        makeSession({ _id: 's1', completedAt: new Date('2026-05-28T10:00:00Z').toISOString() }),
      ];

      render(<MemberTrainingFrequency sessions={sessions} referenceNow={ref} />);

      // 14 week cells
      const cells = screen.getAllByTestId('freq-cell');
      expect(cells).toHaveLength(14);

      // The most recent cell (last) should have an intensity class (not bg-muted)
      const lastCell = cells[cells.length - 1];
      expect(lastCell.className).toMatch(/bg-primary/);
    });

    it('renders all cells as dim (bg-muted) when there are no sessions', () => {
      const ref = new Date('2026-05-30T12:00:00Z');
      render(<MemberTrainingFrequency sessions={[]} referenceNow={ref} />);

      const cells = screen.getAllByTestId('freq-cell');
      expect(cells).toHaveLength(14);
      cells.forEach((cell) => {
        expect(cell.className).toContain('bg-muted');
      });
    });
  });
});
