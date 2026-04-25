import { render, screen } from '@testing-library/react';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

const mockPlan = {
  _id: 'mp1',
  name: 'Push Pull Legs',
  days: [
    { dayNumber: 1, name: 'Day 1 — Push', exercises: [{ exerciseName: 'Bench Press' }] },
    { dayNumber: 2, name: 'Day 2 — Pull', exercises: [{ exerciseName: 'Pull-up' }] },
    { dayNumber: 3, name: 'Day 3 — Legs', exercises: [] },
  ],
};

describe('PlanOverview', () => {
  it('shows plan name', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
  });

  it('renders a card for each day', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getByText('Day 2 — Pull')).toBeInTheDocument();
    expect(screen.getByText('Day 3 — Legs')).toBeInTheDocument();
  });

  it('shows "Start Session" link for each day', () => {
    render(<PlanOverview plan={mockPlan} />);
    const links = screen.getAllByRole('link', { name: /start session/i });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/member/plan/session/new?day=1');
  });

  it('shows empty state when no active plan', () => {
    render(<PlanOverview plan={null} />);
    expect(screen.getByText('No plan assigned')).toBeInTheDocument();
  });
});
