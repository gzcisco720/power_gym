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

vi.mock('@/stores/nutritionStore', () => ({
  useNutritionStore: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
  };
});

import { useNutritionStore } from '@/stores/nutritionStore';
import { TrainerFoodsPage } from '@/pages/trainer/foods';

const mockFetchFoods = vi.fn();
const mockCreateFood = vi.fn();

function renderFoodsPage() {
  return render(
    <MemoryRouter>
      <TrainerFoodsPage />
    </MemoryRouter>,
  );
}

describe('TrainerFoodsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchFoods.mockResolvedValue(undefined);
    mockCreateFood.mockResolvedValue({ _id: 'food-new', name: 'Chicken Breast', brand: null, macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, servings: [] });
  });

  describe('create', () => {
    it('createFood called with parsed numeric macros', async () => {
      vi.mocked(useNutritionStore).mockReturnValue({
        foods: [],
        isLoading: false,
        error: null,
        fetchFoods: mockFetchFoods,
        createFood: mockCreateFood,
        updateFood: vi.fn(),
        deleteFood: vi.fn(),
        templates: [],
        foodSearchResults: [],
        memberPlans: {},
        fetchTemplates: vi.fn(),
        createTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
        searchFood: vi.fn(),
        assignPlan: vi.fn(),
        fetchMemberPlan: vi.fn(),
      } as ReturnType<typeof useNutritionStore>);

      const user = userEvent.setup();
      renderFoodsPage();

      // Open create food dialog
      const newFoodBtns = screen.getAllByRole('button', { name: /new food/i });
      await user.click(newFoodBtns[0]);

      // Fill name
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Chicken Breast');

      // Fill macros
      const kcalInput = screen.getByLabelText(/calor/i);
      await user.clear(kcalInput);
      await user.type(kcalInput, '165');

      const proteinInput = screen.getByLabelText(/protein/i);
      await user.clear(proteinInput);
      await user.type(proteinInput, '31');

      const carbsInput = screen.getByLabelText(/carbs/i);
      await user.clear(carbsInput);
      await user.type(carbsInput, '0');

      const fatInput = screen.getByLabelText(/^fat/i);
      await user.clear(fatInput);
      await user.type(fatInput, '3.6');

      // Submit
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateFood).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Chicken Breast',
            macrosPer100g: expect.objectContaining({
              kcal: 165,
              protein: 31,
              carbs: 0,
              fat: 3.6,
            }),
          }),
        );
      });
    });
  });
});
