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

vi.mock('@/stores/nutritionStore', () => ({
  useNutritionStore: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { useNutritionStore } from '@/stores/nutritionStore';
import { TrainerNutritionPage } from '@/pages/trainer/nutrition';

const sampleTemplates = [
  {
    _id: 'tpl-1',
    name: 'Bulk Phase',
    description: 'High calorie template',
    createdBy: 'trainer-1',
    dayTypes: [],
  },
  {
    _id: 'tpl-2',
    name: 'Cut Phase',
    description: null,
    createdBy: 'trainer-1',
    dayTypes: [],
  },
];

function renderNutritionPage() {
  return render(
    <MemoryRouter>
      <TrainerNutritionPage />
    </MemoryRouter>,
  );
}

describe('TrainerNutritionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loaded', () => {
    it('renders one card per template', () => {
      vi.mocked(useNutritionStore).mockReturnValue({
        templates: sampleTemplates,
        foods: [],
        foodSearchResults: [],
        memberPlans: {},
        isLoading: false,
        error: null,
        fetchTemplates: vi.fn(),
        createTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
        fetchFoods: vi.fn(),
        createFood: vi.fn(),
        updateFood: vi.fn(),
        deleteFood: vi.fn(),
        searchFood: vi.fn(),
        assignPlan: vi.fn(),
        fetchMemberPlan: vi.fn(),
      } as ReturnType<typeof useNutritionStore>);

      renderNutritionPage();

      expect(screen.getByText('Bulk Phase')).toBeInTheDocument();
      expect(screen.getByText('Cut Phase')).toBeInTheDocument();
    });
  });
});
