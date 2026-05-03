import { render, screen, fireEvent } from '@testing-library/react';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

const mockPlan = {
  _id: 'mp1',
  name: 'Push Pull Legs',
  days: [
    {
      dayNumber: 1,
      name: 'Day 1 — Push',
      exercises: [
        {
          groupId: 'g1',
          isSuperset: false,
          exerciseId: 'ex1',
          exerciseName: 'Bench Press',
          imageUrl: null,
          isBodyweight: false,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
      ],
    },
    {
      dayNumber: 2,
      name: 'Day 2 — Pull',
      exercises: [
        {
          groupId: 'g2',
          isSuperset: false,
          exerciseId: 'ex2',
          exerciseName: 'Pull-up',
          imageUrl: null,
          isBodyweight: true,
          sets: 3,
          repsMin: 8,
          repsMax: 10,
          restSeconds: 60,
        },
      ],
    },
    {
      dayNumber: 3,
      name: 'Day 3 — Legs',
      exercises: [],
    },
  ],
};

describe('PlanOverview', () => {
  it('shows plan name', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
  });

  it('renders a tab for each day', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getByText('Day 2 — Pull')).toBeInTheDocument();
    expect(screen.getByText('Day 3 — Legs')).toBeInTheDocument();
  });

  it('shows "Log This Workout" link pointing to the active day', () => {
    render(<PlanOverview plan={mockPlan} />);
    const link = screen.getByRole('link', { name: /log this workout/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/member/plan/session/new?day=1');
  });

  it('updates "Log This Workout" href when a different day tab is clicked', () => {
    render(<PlanOverview plan={mockPlan} />);
    const dayTwoTab = screen.getByRole('button', { name: /day 2 — pull/i });
    fireEvent.click(dayTwoTab);
    const link = screen.getByRole('link', { name: /log this workout/i });
    expect(link).toHaveAttribute('href', '/member/plan/session/new?day=2');
  });

  it('shows exercises for the active day', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows "No exercises in this day" when active day has no exercises', () => {
    render(<PlanOverview plan={mockPlan} />);
    const dayThreeTab = screen.getByRole('button', { name: /day 3 — legs/i });
    fireEvent.click(dayThreeTab);
    expect(screen.getByText('No exercises in this day.')).toBeInTheDocument();
  });

  it('shows empty state when no active plan', () => {
    render(<PlanOverview plan={null} />);
    expect(screen.getByText('No plan assigned')).toBeInTheDocument();
  });

  it('uses sessionBasePath prop for the workout link', () => {
    render(<PlanOverview plan={mockPlan} sessionBasePath="/owner/my-plan" />);
    const link = screen.getByRole('link', { name: /log this workout/i });
    expect(link).toHaveAttribute('href', '/owner/my-plan/session/new?day=1');
  });
});
