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

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/stores/trainingStore', () => ({
  useTrainingStore: vi.fn(),
}));

import { useTrainingStore } from '@/stores/trainingStore';
import { TrainerMemberPlanPage } from '@/pages/trainer/member-plan';

const mockAssignPlan = vi.fn();
const mockFetchPlans = vi.fn();
const mockFetchMemberPlan = vi.fn();

function renderPlanPage(memberId = 'member-1') {
  return render(
    <MemoryRouter initialEntries={[`/trainer/members/${memberId}/plan`]}>
      <Routes>
        <Route path="/trainer/members/:id/plan" element={<TrainerMemberPlanPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainerMemberPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignPlan.mockResolvedValue(undefined);
    mockFetchPlans.mockResolvedValue(undefined);
    mockFetchMemberPlan.mockResolvedValue(undefined);

    vi.mocked(useTrainingStore).mockReturnValue({
      plans: [{ _id: 'plan-1', name: 'Strength A', description: null, createdBy: 'trainer-1', days: [] }],
      memberPlans: {},
      activeSession: null,
      pbs: {},
      exerciseNotes: {},
      isLoading: false,
      error: null,
      fetchPlans: mockFetchPlans,
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(),
      fetchMemberPlan: mockFetchMemberPlan,
      assignPlan: mockAssignPlan,
      startSession: vi.fn(),
      updateSet: vi.fn(),
      completeSession: vi.fn(),
      fetchPbs: vi.fn(),
      saveExerciseNote: vi.fn(),
    } as ReturnType<typeof useTrainingStore>);
  });

  describe('assign', () => {
    it('assignPlan called with memberId and selected planId', async () => {
      renderPlanPage('member-1');

      // Click Assign Plan button
      fireEvent.click(screen.getByRole('button', { name: /assign plan/i }));

      // Select the plan
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'plan-1' } });

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

      await waitFor(() => {
        expect(mockAssignPlan).toHaveBeenCalledWith('member-1', 'plan-1');
      });
    });
  });
});
