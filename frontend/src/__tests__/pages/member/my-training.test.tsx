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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/trainingStore', () => ({
  useTrainingStore: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { MemberMyTrainingPage } from '@/pages/member/my-training';

const mockStartSession = vi.fn();
const mockFetchMemberPlan = vi.fn();

const samplePlan = {
  _id: 'plan-1',
  memberId: 'member-1',
  templateId: 'tmpl-1',
  name: 'Strength Plan',
  days: [{ dayNumber: 1, name: 'Push', exercises: [] }],
  isActive: true,
  assignedAt: '2025-01-01T00:00:00.000Z',
};

function renderMyTraining() {
  return render(
    <MemoryRouter initialEntries={['/member/my-training']}>
      <Routes>
        <Route path="/member/my-training" element={<MemberMyTrainingPage />} />
        <Route path="/member/my-training/session/:id" element={<div>Session Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberMyTrainingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSession.mockResolvedValue(undefined);
    mockFetchMemberPlan.mockResolvedValue(undefined);

    vi.mocked(useAuthStore).mockReturnValue({
      status: 'authenticated',
      accessToken: 'tok',
      user: { id: 'member-1', email: 'member@test.com', role: 'member', name: 'Alice' },
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      initAuth: vi.fn(),
    } as ReturnType<typeof useAuthStore>);
  });

  describe('render', () => {
    it('renders plan path card and freestyle path card', () => {
      vi.mocked(useTrainingStore).mockReturnValue({
        plans: [],
        memberPlans: { 'member-1': samplePlan },
        memberSessions: {},
        activeSession: null,
        pbs: {},
        exerciseNotes: {},
        isLoading: false,
        error: null,
        fetchPlans: vi.fn(),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
        deletePlan: vi.fn(),
        fetchMemberPlan: mockFetchMemberPlan,
        assignPlan: vi.fn(),
        fetchSessions: vi.fn(),
        startSession: mockStartSession,
        updateSet: vi.fn(),
        completeSession: vi.fn(),
        fetchPbs: vi.fn(),
        saveExerciseNote: vi.fn(),
      } as ReturnType<typeof useTrainingStore>);

      renderMyTraining();

      // Both path cards must be present
      expect(screen.getByText(/my plan/i)).toBeInTheDocument();
      // Freestyle card title appears (may appear multiple times - check at least one)
      expect(screen.getAllByText(/freestyle/i).length).toBeGreaterThan(0);
    });
  });

  describe('start', () => {
    it('startSession called and navigates to session route on success', async () => {
      const startedSession = {
        _id: 'session-123',
        memberId: 'member-1',
        memberPlanId: 'plan-1',
        dayNumber: 1,
        completedAt: null,
        sets: [],
      };
      mockStartSession.mockResolvedValue(undefined);

      vi.mocked(useTrainingStore).mockReturnValue({
        plans: [],
        memberPlans: { 'member-1': samplePlan },
        memberSessions: {},
        activeSession: startedSession,
        pbs: {},
        exerciseNotes: {},
        isLoading: false,
        error: null,
        fetchPlans: vi.fn(),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
        deletePlan: vi.fn(),
        fetchMemberPlan: mockFetchMemberPlan,
        assignPlan: vi.fn(),
        fetchSessions: vi.fn(),
        startSession: mockStartSession,
        updateSet: vi.fn(),
        completeSession: vi.fn(),
        fetchPbs: vi.fn(),
        saveExerciseNote: vi.fn(),
      } as ReturnType<typeof useTrainingStore>);

      renderMyTraining();

      const startBtn = screen.getByRole('button', { name: /start session/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(mockStartSession).toHaveBeenCalledWith('member-1', expect.any(Number));
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringMatching(/\/member\/my-training\/session\//),
        );
      });
    });
  });
});
