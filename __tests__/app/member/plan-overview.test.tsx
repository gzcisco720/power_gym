import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
  beforeEach(() => {
    mockPush.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _id: 'session1' }),
    }) as jest.Mock;
  });

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

  it('shows "Log This Workout" button for the active day', async () => {
    render(<PlanOverview plan={mockPlan} />);
    const btn = screen.getByRole('button', { name: /log this workout/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
        }),
      );
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/member/plan/session/session1'));
  });

  it('posts dayNumber 2 when day 2 tab is active', async () => {
    render(<PlanOverview plan={mockPlan} />);
    const dayTwoTab = screen.getByRole('button', { name: /day 2 — pull/i });
    fireEvent.click(dayTwoTab);
    const btn = screen.getByRole('button', { name: /log this workout/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
        }),
      );
    });
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

  it('uses sessionBasePath prop when navigating after session start', async () => {
    render(<PlanOverview plan={mockPlan} sessionBasePath="/owner/my-plan" />);
    const btn = screen.getByRole('button', { name: /log this workout/i });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/owner/my-plan/session/session1'),
    );
  });
});
