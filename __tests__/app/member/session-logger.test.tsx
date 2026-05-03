import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock ExerciseSearchSheet to avoid Sheet/fetch complexity in these unit tests
jest.mock('@/components/training/exercise-search-sheet', () => ({
  ExerciseSearchSheet: () => null,
}));

// Mock ExerciseThumbnail and ExerciseBadge as simple stubs
jest.mock('@/components/training/exercise-thumbnail', () => ({
  ExerciseThumbnail: ({ name }: { name: string }) => <span data-testid="thumbnail">{name}</span>,
}));

jest.mock('@/components/training/exercise-badge', () => ({
  ExerciseBadge: ({ label }: { label: string }) => <span data-testid="badge">{label}</span>,
}));

const mockSession = {
  _id: 's1',
  memberId: 'm1',
  dayName: 'Day 1 — Push',
  startedAt: new Date(Date.now() - 60000).toISOString(),
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
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/exercises') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockSession }) });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows day name and exercise name', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
  });

  it('shows prescribed reps range for each set', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getAllByText('8–10 reps').length).toBeGreaterThanOrEqual(1);
  });

  it('always shows "Complete Workout" button', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument();
  });

  it('shows "Complete Workout" button even when all sets are done', async () => {
    const completedSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, completedAt: new Date().toISOString() })),
    };
    await act(async () => { render(<SessionLogger session={completedSession} />); });
    expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument();
  });

  it('shows inline weight and reps inputs for each incomplete set', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    // 2 sets, each has weight + reps input
    expect(screen.getAllByPlaceholderText('kg')).toHaveLength(2);
    expect(screen.getAllByPlaceholderText('reps')).toHaveLength(2);
  });

  it('calls PATCH API when check button is clicked for a set', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await act(async () => { render(<SessionLogger session={mockSession} />); });

    const weightInputs = screen.getAllByPlaceholderText('kg');
    const repsInputs = screen.getAllByPlaceholderText('reps');

    await user.type(weightInputs[0], '80');
    await user.type(repsInputs[0], '10');

    const checkButtons = screen.getAllByRole('button', { name: /complete set 1/i });
    await act(async () => { fireEvent.click(checkButtons[0]); });

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/sets/0',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

  it('calls toast.error with server message when logSet fails', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/exercises') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Session not found' }) });
    });
    await act(async () => { render(<SessionLogger session={mockSession} />); });

    const repsInputs = screen.getAllByPlaceholderText('reps');
    fireEvent.change(repsInputs[0], { target: { value: '10' } });

    const checkButtons = screen.getAllByRole('button', { name: /complete set 1/i });
    await act(async () => { fireEvent.click(checkButtons[0]); });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Session not found'));
  });

  it('shows elapsed timer in mm:ss format', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    // Should show a timer like "01:00" given startedAt 60 seconds ago
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('shows BW placeholder instead of weight input for bodyweight exercises', async () => {
    const bwSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, isBodyweight: true })),
    };
    await act(async () => { render(<SessionLogger session={bwSession} />); });
    // No kg placeholders for bodyweight exercises
    expect(screen.queryByPlaceholderText('kg')).not.toBeInTheDocument();
    // BW label shown in the div placeholder
    const bwDivs = document.querySelectorAll('.text-\\[10px\\].text-\\[\\#333\\]');
    expect(bwDivs.length).toBeGreaterThan(0);
  });

  it('shows completed set as done with check icon and no inputs', async () => {
    const partialSession = {
      ...mockSession,
      sets: [
        { ...mockSession.sets[0], completedAt: new Date().toISOString(), actualWeight: 80, actualReps: 10 },
        mockSession.sets[1],
      ],
    };
    await act(async () => { render(<SessionLogger session={partialSession} />); });
    // Only 1 incomplete set → 1 weight input
    expect(screen.getAllByPlaceholderText('kg')).toHaveLength(1);
    // Completed set shows logged data
    expect(screen.getByText(/80 kg × 10 reps/)).toBeInTheDocument();
  });

  it('calls POST to add a set when "+ Add Set" is clicked', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    const addSetBtn = screen.getByText('+ Add Set');
    await act(async () => { fireEvent.click(addSetBtn); });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/sets',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('calls POST to complete session when "Complete Workout" is clicked', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    const completeBtn = screen.getByRole('button', { name: /complete workout/i });
    await act(async () => { fireEvent.click(completeBtn); });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/complete',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
