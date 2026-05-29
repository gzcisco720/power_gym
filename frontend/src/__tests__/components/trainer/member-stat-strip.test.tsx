import { render, screen } from '@testing-library/react';
import { MemberStatStrip } from '@/components/trainer/member-stat-strip';
import type { BodyTest } from '@/api/body-tests';
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

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
    _id: 'bt-1',
    memberId: 'member-1',
    protocol: '3-site',
    weight: 80,
    chest: null,
    abdominal: null,
    thigh: null,
    bodyFatPct: 18.5,
    leanMassKg: 65.2,
    fatMassKg: 14.8,
    date: new Date('2026-05-28').toISOString(),
    ...overrides,
  };
}

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

describe('MemberStatStrip', () => {
  describe('renders', () => {
    it('shows latest weight and bodyFatPct from the most recent body test', () => {
      const bodyTests = [
        makeBodyTest({ _id: 'bt-1', weight: 80, bodyFatPct: 18.5, date: new Date('2026-05-28').toISOString() }),
        makeBodyTest({ _id: 'bt-2', weight: 82, bodyFatPct: 20.0, date: new Date('2026-04-01').toISOString() }),
      ];
      const sessions = [makeSession()];

      render(
        <MemberStatStrip
          bodyTests={bodyTests}
          sessions={sessions}
          referenceNow={new Date('2026-05-30')}
        />,
      );

      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('18.5')).toBeInTheDocument();
    });

    it('shows session count for the last 90 days', () => {
      const sessions = [
        makeSession({ _id: 's1', completedAt: new Date('2026-05-28T10:00:00Z').toISOString() }),
        makeSession({ _id: 's2', completedAt: new Date('2026-04-15T10:00:00Z').toISOString() }),
      ];

      render(
        <MemberStatStrip
          bodyTests={[]}
          sessions={sessions}
          referenceNow={new Date('2026-05-30')}
        />,
      );

      // Both sessions are within 90 days of 2026-05-30
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('empty', () => {
    it('shows "—" for weight and body-fat when no body tests exist', () => {
      render(
        <MemberStatStrip
          bodyTests={[]}
          sessions={[]}
          referenceNow={new Date('2026-05-30')}
        />,
      );

      // Both weight and body fat show "—"
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
