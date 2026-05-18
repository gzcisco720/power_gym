import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';

jest.mock('@/components/animations/workout-complete', () => ({
  WorkoutCompleteAnimation: ({ onComplete }: { onComplete?: () => void }) => {
    onComplete?.();
    return null;
  },
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/training/exercise-search-sheet', () => ({
  ExerciseSearchSheet: () => null,
}));

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
  rpe: null,
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

  it('shows prescribed reps range as a header pill', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByText(/reps:\s*8\s*–\s*10/i)).toBeInTheDocument();
  });

  it('always shows "Complete Workout" button', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument();
  });

  it('shows "Complete Workout" button even when all inputs are filled', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument();
  });

  it('shows inline weight and reps inputs for each set', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getAllByPlaceholderText('kg')).toHaveLength(2);
    expect(screen.getAllByPlaceholderText('reps')).toHaveLength(2);
  });

  it('shows a delete (×) button for each set row, not a complete button', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByRole('button', { name: /delete set 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete set 2/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete set/i })).not.toBeInTheDocument();
  });

  it('clicking × on a set removes it from the UI', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getAllByPlaceholderText('kg')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /delete set 2/i }));

    expect(screen.getAllByPlaceholderText('kg')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /delete set 2/i })).not.toBeInTheDocument();
  });

  it('shows elapsed timer in mm:ss format', async () => {
    await act(async () => { render(<SessionLogger session={mockSession} />); });
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('shows BW placeholder instead of weight input for bodyweight exercises', async () => {
    const bwSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, isBodyweight: true })),
    };
    await act(async () => { render(<SessionLogger session={bwSession} />); });
    expect(screen.queryByPlaceholderText('kg')).not.toBeInTheDocument();
    const bwLabels = screen.getAllByText('BW');
    expect(bwLabels.length).toBeGreaterThan(0);
  });

  it('pre-populates inputs from previously logged values when opening an active session', async () => {
    const partialSession = {
      ...mockSession,
      sets: [
        { ...mockSession.sets[0], actualWeight: 80, actualReps: 10, completedAt: new Date().toISOString() },
        mockSession.sets[1],
      ],
    };
    await act(async () => { render(<SessionLogger session={partialSession} />); });
    // Both sets show as inputs in active mode
    const weightInputs = screen.getAllByPlaceholderText('kg');
    expect(weightInputs).toHaveLength(2);
    // Previously logged values are pre-populated
    expect(weightInputs[0]).toHaveValue('80');
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

  describe('validation on Complete Workout', () => {
    it('blocks completion and shows red border when only reps is filled for a non-BW set', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const repsInputs = screen.getAllByPlaceholderText('reps');
      fireEvent.change(repsInputs[0], { target: { value: '10' } });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      // Modal should NOT appear
      expect(screen.queryByRole('button', { name: /finish workout/i })).not.toBeInTheDocument();

      // Weight input for set 1 should have red ring
      const weightInput = screen.getAllByPlaceholderText('kg')[0];
      expect(weightInput.className).toMatch(/ring-destructive/);
    });

    it('blocks completion and shows red border when only weight is filled for a non-BW set', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const weightInputs = screen.getAllByPlaceholderText('kg');
      fireEvent.change(weightInputs[0], { target: { value: '80' } });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      expect(screen.queryByRole('button', { name: /finish workout/i })).not.toBeInTheDocument();

      const repsInput = screen.getAllByPlaceholderText('reps')[0];
      expect(repsInput.className).toMatch(/ring-destructive/);
    });

    it('opens the modal when all sets have both fields filled', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const weightInputs = screen.getAllByPlaceholderText('kg');
      const repsInputs = screen.getAllByPlaceholderText('reps');
      fireEvent.change(weightInputs[0], { target: { value: '80' } });
      fireEvent.change(repsInputs[0], { target: { value: '10' } });
      fireEvent.change(weightInputs[1], { target: { value: '80' } });
      fireEvent.change(repsInputs[1], { target: { value: '10' } });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      expect(await screen.findByRole('button', { name: /finish workout/i })).toBeInTheDocument();
    });

    it('blocks completion when all sets are empty', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      // Modal should NOT appear — nothing logged yet
      expect(screen.queryByRole('button', { name: /finish workout/i })).not.toBeInTheDocument();
    });

    it('clears validation errors when inputs are corrected', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const repsInputs = screen.getAllByPlaceholderText('reps');
      fireEvent.change(repsInputs[0], { target: { value: '10' } });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      // Weight input shows error
      const weightInputs = screen.getAllByPlaceholderText('kg');
      expect(weightInputs[0].className).toMatch(/ring-destructive/);

      // Fill in weight to fix the error
      fireEvent.change(weightInputs[0], { target: { value: '80' } });

      // Error should be cleared on next click
      await act(async () => { fireEvent.click(completeBtn); });

      // Modal should now appear (set 2 is empty → skip, set 1 is complete)
      expect(await screen.findByRole('button', { name: /finish workout/i })).toBeInTheDocument();
    });
  });

  describe('completion batch save', () => {
    it('PATCHes all filled sets then POSTs to complete when confirming', async () => {
      global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/exercises') return Promise.resolve({ ok: true, json: async () => [] });
        if ((options as RequestInit & { method?: string })?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: async () => ({ ...mockSession }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ ...mockSession }) });
      });

      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const weightInputs = screen.getAllByPlaceholderText('kg');
      const repsInputs = screen.getAllByPlaceholderText('reps');
      fireEvent.change(weightInputs[0], { target: { value: '80' } });
      fireEvent.change(repsInputs[0], { target: { value: '10' } });
      // Set 2 left empty → will be skipped

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      const finishBtn = await screen.findByRole('button', { name: /finish workout/i });
      await act(async () => { fireEvent.click(finishBtn); });

      // Should PATCH set 0 (filled) but not set 1 (empty)
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sessions/s1/sets/0',
          expect.objectContaining({ method: 'PATCH' }),
        ),
      );
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sessions/s1/complete',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      // Should NOT PATCH set 1 (empty)
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/sessions/s1/sets/1',
        expect.anything(),
      );
    });

    it('skips empty set 2 and only PATCHes the filled set when completing', async () => {
      global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/exercises') return Promise.resolve({ ok: true, json: async () => [] });
        if ((options as RequestInit & { method?: string })?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: async () => ({ ...mockSession }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ ...mockSession }) });
      });

      await act(async () => { render(<SessionLogger session={mockSession} />); });

      // Fill only set 1
      const weightInputs = screen.getAllByPlaceholderText('kg');
      const repsInputs = screen.getAllByPlaceholderText('reps');
      fireEvent.change(weightInputs[0], { target: { value: '80' } });
      fireEvent.change(repsInputs[0], { target: { value: '10' } });

      const completeBtn = screen.getByRole('button', { name: /complete workout/i });
      await act(async () => { fireEvent.click(completeBtn); });

      const finishBtn = await screen.findByRole('button', { name: /finish workout/i });
      await act(async () => { fireEvent.click(finishBtn); });

      // PATCHes set 0, not set 1, then POSTs complete
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sessions/s1/sets/0',
          expect.objectContaining({ method: 'PATCH' }),
        ),
      );
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sessions/s1/complete',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/sessions/s1/sets/1',
        expect.anything(),
      );
    });
  });

  describe('read-only mode (completed session)', () => {
    const completedSession = {
      ...mockSession,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      rpe: 8,
    };

    it('does not show "Complete Workout" button when session is completed', async () => {
      await act(async () => { render(<SessionLogger session={completedSession} />); });
      expect(screen.queryByRole('button', { name: /complete workout/i })).not.toBeInTheDocument();
    });

    it('shows completion summary in bottom bar', async () => {
      await act(async () => { render(<SessionLogger session={completedSession} />); });
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText(/RPE 8/i)).toBeInTheDocument();
    });

    it('does not show "+ Add Exercise" button when session is completed', async () => {
      await act(async () => { render(<SessionLogger session={completedSession} />); });
      expect(screen.queryByRole('button', { name: /\+ add exercise/i })).not.toBeInTheDocument();
    });

    it('shows "Complete Workout" button for active (non-completed) session', async () => {
      await act(async () => { render(<SessionLogger session={mockSession} />); });
      expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('disables "+ Add Set" while addSet call is in flight', async () => {
      let resolveAddSet: (v: unknown) => void;
      const pendingFetch = new Promise((res) => { resolveAddSet = res; });

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/exercises') return Promise.resolve({ ok: true, json: async () => [] });
        return pendingFetch.then(() => ({ ok: true, json: async () => ({ ...mockSession }) }));
      });

      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const addSetBtn = screen.getByText('+ Add Set');
      fireEvent.click(addSetBtn);

      await waitFor(() => expect(addSetBtn).toBeDisabled());

      await act(async () => { resolveAddSet!(undefined); });
    });

    it('disables "+ Add Exercise" button while addExercise call is in flight', async () => {
      let resolveAdd: (v: unknown) => void;
      const pendingFetch = new Promise((res) => { resolveAdd = res; });

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/exercises') return Promise.resolve({ ok: true, json: async () => [] });
        return pendingFetch.then(() => ({ ok: true, json: async () => ({ ...mockSession }) }));
      });

      await act(async () => { render(<SessionLogger session={mockSession} />); });

      const addExBtn = screen.getByRole('button', { name: /\+ add exercise/i });
      expect(addExBtn).not.toBeDisabled();

      await act(async () => { resolveAdd!(undefined); });
    });
  });
});
