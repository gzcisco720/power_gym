import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MemberPlanCard } from '@/components/trainer/member-plan-card';
import type { MemberPlan, WorkoutSession } from '@/api/training';

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

function makePlan(overrides: Partial<MemberPlan> = {}): MemberPlan {
  return {
    _id: 'plan-1',
    memberId: 'member-1',
    templateId: 'tmpl-1',
    name: 'Strength Block A',
    days: [{ dayNumber: 1, exercises: [] }, { dayNumber: 2, exercises: [] }],
    isActive: true,
    assignedAt: new Date('2026-04-01').toISOString(),
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

function renderCard(props: Parameters<typeof MemberPlanCard>[0]) {
  return render(
    <MemoryRouter>
      <MemberPlanCard {...props} />
    </MemoryRouter>,
  );
}

describe('MemberPlanCard', () => {
  describe('with plan', () => {
    it('renders plan name and a recent-sessions list', () => {
      const plan = makePlan();
      const sessions = [
        makeSession({ _id: 's1', dayNumber: 1, completedAt: new Date('2026-05-28T10:00:00Z').toISOString() }),
        makeSession({ _id: 's2', dayNumber: 2, completedAt: new Date('2026-05-25T10:00:00Z').toISOString() }),
      ];

      renderCard({ memberId: 'member-1', plan, sessions });

      expect(screen.getByText('Strength Block A')).toBeInTheDocument();
      // Recent sessions section heading
      expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
    });
  });

  describe('no plan', () => {
    it('renders an empty state prompting to assign a plan', () => {
      renderCard({ memberId: 'member-1', plan: null, sessions: [] });

      expect(screen.getByText(/no active training plan/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /assign plan/i })).toBeInTheDocument();
    });
  });
});
