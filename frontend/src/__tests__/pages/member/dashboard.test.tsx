import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

vi.mock('@/stores/bodyTestsStore', () => ({
  useBodyTestsStore: vi.fn(),
}));

import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { MemberDashboardPage } from '@/pages/member/dashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <MemberDashboardPage />
    </MemoryRouter>,
  );
}

describe('MemberDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      status: 'authenticated',
      accessToken: 'tok',
      user: { id: 'member-1', email: 'member@test.com', role: 'member', name: 'Alice' },
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      initAuth: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    vi.mocked(useTrainingStore).mockReturnValue({
      plans: [],
      memberPlans: { 'member-1': null },
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

    vi.mocked(useBodyTestsStore).mockReturnValue({
      testsByMember: {},
      isLoading: false,
      error: null,
      fetchTests: vi.fn(),
      createTest: vi.fn(),
      deleteTest: vi.fn(),
      exportCsv: vi.fn(),
    } as ReturnType<typeof useBodyTestsStore>);
  });

  describe('renders', () => {
    it('shows greeting with user name and at least one summary card', () => {
      renderDashboard();

      // Greeting text must contain the user name
      expect(screen.getByText(/alice/i)).toBeInTheDocument();

      // At least one stat/summary card — we check for a card with accessible role
      // or a specific data-testid / well-known label
      expect(screen.getByText(/my training/i)).toBeInTheDocument();
    });
  });
});
