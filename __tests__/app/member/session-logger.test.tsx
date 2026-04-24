import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
    button: ({
      children,
      className,
      onClick,
      type,
      'aria-label': ariaLabel,
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string }) => (
      <button className={className} onClick={onClick} type={type} aria-label={ariaLabel}>
        {children}
      </button>
    ),
  },
  useReducedMotion: () => false,
}));

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
    expect(screen.getAllByText('8–10 reps').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Complete Session" button when all sets done', () => {
    const completedSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, completedAt: new Date().toISOString() })),
    };
    render(<SessionLogger session={completedSession} />);
    expect(screen.getByRole('button', { name: /complete session/i })).toBeInTheDocument();
  });

  it('does not show "Complete Session" when sets remain', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.queryByRole('button', { name: /complete session/i })).not.toBeInTheDocument();
  });

  it('calls PATCH API when set logged via log form', async () => {
    const user = userEvent.setup();
    render(<SessionLogger session={mockSession} />);

    // Click the first SetChip to open the log form
    const setChips = screen.getAllByRole('button', { name: /set 1/i });
    fireEvent.click(setChips[0]);

    const weightInput = screen.getByRole('spinbutton', { name: /weight/i });
    const repsInput = screen.getByRole('spinbutton', { name: /reps/i });

    await user.type(weightInput, '80');
    await user.type(repsInput, '10');

    const logButton = screen.getByRole('button', { name: /log set/i });
    fireEvent.click(logButton);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/sets/0',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });
});
