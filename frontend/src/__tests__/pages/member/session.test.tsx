import { render, screen } from '@testing-library/react';
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useTrainingStore } from '@/stores/trainingStore';
import { MemberSessionPage } from '@/pages/member/session';

function renderSession(sessionId = 'session-1') {
  return render(
    <MemoryRouter initialEntries={[`/member/my-training/session/${sessionId}`]}>
      <Routes>
        <Route path="/member/my-training/session/:id" element={<MemberSessionPage />} />
        <Route path="/member/my-training" element={<div>My Training</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('noActiveSession', () => {
    it('redirects to /member/my-training when activeSession is null', () => {
      vi.mocked(useTrainingStore).mockReturnValue({
        plans: [],
        memberPlans: {},
        activeSession: null,
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
        updateSet: vi.fn(),
        completeSession: vi.fn(),
        fetchPbs: vi.fn(),
        saveExerciseNote: vi.fn(),
      } as ReturnType<typeof useTrainingStore>);

      renderSession();

      expect(mockNavigate).toHaveBeenCalledWith('/member/my-training', { replace: true });
    });
  });

  describe('completed', () => {
    it('shows Session Complete heading when session is completed', () => {
      const completedSession = {
        _id: 'session-1',
        memberId: 'member-1',
        memberPlanId: 'plan-1',
        dayNumber: 1,
        completedAt: '2025-01-01T12:00:00.000Z',
        sets: [],
      };

      vi.mocked(useTrainingStore).mockReturnValue({
        plans: [],
        memberPlans: {},
        activeSession: completedSession,
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
        updateSet: vi.fn(),
        completeSession: vi.fn(),
        fetchPbs: vi.fn(),
        saveExerciseNote: vi.fn(),
      } as ReturnType<typeof useTrainingStore>);

      renderSession();

      expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    });
  });
});
