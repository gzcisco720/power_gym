import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

vi.mock('@/stores/trainingStore', () => ({
  useTrainingStore: vi.fn(),
}));

vi.mock('@/api/training', () => ({
  getSession: vi.fn(),
}));

import { useTrainingStore } from '@/stores/trainingStore';
import * as trainingApi from '@/api/training';
import { TrainerMemberLogSessionPage } from '@/pages/trainer/member-log-session';

const mockUpdateSet = vi.fn();
const mockCompleteSession = vi.fn();

const sampleSession = {
  _id: 'session-1',
  memberId: 'member-1',
  memberPlanId: 'plan-1',
  dayNumber: 1,
  completedAt: null,
  sets: [
    { exerciseId: 'ex-1', setIndex: 0, weight: null, reps: null, completed: false },
  ],
};

function renderLogSessionPage(memberId = 'member-1', sessionId = 'session-1') {
  return render(
    <MemoryRouter initialEntries={[`/trainer/members/${memberId}/log/${sessionId}`]}>
      <Routes>
        <Route path="/trainer/members/:id/log/:sessionId" element={<TrainerMemberLogSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainerMemberLogSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSet.mockResolvedValue(sampleSession);
    mockCompleteSession.mockResolvedValue({ ...sampleSession, completedAt: new Date().toISOString() });

    vi.mocked(trainingApi.getSession).mockResolvedValue(sampleSession);

    vi.mocked(useTrainingStore).mockReturnValue({
      plans: [],
      memberPlans: {},
      activeSession: sampleSession,
      pbs: {},
      exerciseNotes: {},
      isLoading: false,
      error: null,
      fetchPlans: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(),
      fetchMemberPlan: vi.fn(),
      assignPlan: vi.fn(),
      startSession: vi.fn(),
      updateSet: mockUpdateSet,
      completeSession: mockCompleteSession,
      fetchPbs: vi.fn(),
      saveExerciseNote: vi.fn(),
    } as ReturnType<typeof useTrainingStore>);
  });

  describe('updateSet', () => {
    it('updateSet called with index and numeric weight', async () => {
      renderLogSessionPage();

      // Weight input for set 0
      const weightInput = screen.getByPlaceholderText(/weight/i);
      fireEvent.change(weightInput, { target: { value: '100' } });
      fireEvent.blur(weightInput);

      await waitFor(() => {
        expect(mockUpdateSet).toHaveBeenCalledWith(
          'session-1',
          0,
          expect.objectContaining({ weight: 100 }),
        );
      });
    });
  });
});
