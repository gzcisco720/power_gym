import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockSession = {
  _id: 's1',
  memberId: 'm1',
  dayName: 'Day 1 — Push',
  completedAt: null,
  sets: [
    {
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      groupId: 'A',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
    {
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      groupId: 'A',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 2,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
  ],
};

describe('SessionLogger', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockSession }),
    });
  });

  it('shows day name and exercise name', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
  });

  it('shows prescribed reps range for each set', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.getAllByText('8-10 次').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "完成训练" button when all sets done', () => {
    const completedSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, completedAt: new Date().toISOString() })),
    };
    render(<SessionLogger session={completedSession} />);
    expect(screen.getByRole('button', { name: /完成训练/i })).toBeInTheDocument();
  });

  it('does not show "完成训练" when sets remain', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.queryByRole('button', { name: /完成训练/i })).not.toBeInTheDocument();
  });

  it('calls PATCH API when set marked complete', async () => {
    const user = userEvent.setup();
    render(<SessionLogger session={mockSession} />);

    const weightInputs = screen.getAllByPlaceholderText(/重量/i);
    const repsInputs = screen.getAllByPlaceholderText(/次数/i);

    await user.type(weightInputs[0], '80');
    await user.type(repsInputs[0], '10');

    const logButtons = screen.getAllByRole('button', { name: /记录/i });
    fireEvent.click(logButtons[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/sets/0',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });
});
