import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('@/stores/trainingStore', () => ({
  useTrainingStore: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'plan-1' }),
  };
});

import { useTrainingStore } from '@/stores/trainingStore';
import { TrainerPlansPage } from '@/pages/trainer/plans';
import { PlanTemplateForm } from '@/components/training/plan-template-form';

const mockFetchPlans = vi.fn();
const mockCreatePlan = vi.fn();
const mockUpdatePlan = vi.fn();
const mockDeletePlan = vi.fn();

const samplePlans = [
  {
    _id: 'plan-1',
    name: 'Push Pull Legs',
    description: 'Classic PPL split',
    createdBy: 'trainer-1',
    days: [
      { dayNumber: 1, name: 'Push', exercises: [] },
      { dayNumber: 2, name: 'Pull', exercises: [] },
      { dayNumber: 3, name: 'Legs', exercises: [] },
    ],
  },
  {
    _id: 'plan-2',
    name: 'Full Body',
    description: null,
    createdBy: 'trainer-1',
    days: [
      { dayNumber: 1, name: 'Day 1', exercises: [] },
    ],
  },
];

function renderPlansPage() {
  return render(
    <MemoryRouter>
      <TrainerPlansPage />
    </MemoryRouter>,
  );
}

function renderPlanForm(props?: Partial<React.ComponentProps<typeof PlanTemplateForm>>) {
  return render(
    <MemoryRouter>
      <PlanTemplateForm
        onSubmit={props?.onSubmit ?? vi.fn()}
        onCancel={props?.onCancel ?? vi.fn()}
        initialData={props?.initialData}
        mode={props?.mode ?? 'create'}
        planId={props?.planId}
      />
    </MemoryRouter>,
  );
}

describe('TrainerPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPlans.mockResolvedValue(undefined);
    mockCreatePlan.mockResolvedValue(undefined);
    mockDeletePlan.mockResolvedValue(undefined);
  });

  describe('loaded', () => {
    it('renders one card per plan template with day count', async () => {
      vi.mocked(useTrainingStore).mockReturnValue({
        plans: samplePlans,
        isLoading: false,
        error: null,
        fetchPlans: mockFetchPlans,
        createPlan: mockCreatePlan,
        updatePlan: mockUpdatePlan,
        deletePlan: mockDeletePlan,
      } as ReturnType<typeof useTrainingStore>);

      renderPlansPage();

      expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
      expect(screen.getByText('Full Body')).toBeInTheDocument();

      // Day count chips visible (3 days vs 1 day)
      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(screen.getByText('Pull')).toBeInTheDocument();
      expect(screen.getByText('Legs')).toBeInTheDocument();
      expect(screen.getByText('Day 1')).toBeInTheDocument();
    });
  });
});

describe('PlanTemplateForm', () => {
  describe('dirty', () => {
    it('Save disabled until a field changes in edit mode', async () => {
      const user = userEvent.setup();

      const initialData = {
        name: 'Existing Plan',
        description: null,
        days: [],
      };

      renderPlanForm({ initialData, mode: 'edit' });

      // Save button should be disabled initially in edit mode
      const saveBtn = screen.getByRole('button', { name: /save plan/i });
      expect(saveBtn).toBeDisabled();

      // Edit the name → Save should become enabled
      const nameInput = screen.getByLabelText(/plan name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Plan');

      expect(saveBtn).not.toBeDisabled();
    });
  });

  describe('submit', () => {
    it('createPlan called with name and days payload', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      renderPlanForm({ onSubmit, mode: 'create' });

      const nameInput = screen.getByLabelText(/plan name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'My New Plan');

      const saveBtn = screen.getByRole('button', { name: /save plan/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My New Plan',
            days: expect.any(Array),
          }),
        );
      });
    });
  });
});
