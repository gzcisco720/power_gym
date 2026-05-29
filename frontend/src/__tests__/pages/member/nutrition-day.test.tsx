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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/nutritionStore', () => ({
  useNutritionStore: vi.fn(),
}));

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

import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { MemberNutritionDayPage } from '@/pages/member/nutrition-day';

const samplePlan = {
  _id: 'np-1',
  memberId: 'member-1',
  nutritionTemplateId: 'tmpl-1',
  nutritionTemplate: {
    _id: 'tmpl-1',
    name: 'Bulk Template',
    description: null,
    createdBy: 'trainer-1',
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          { name: 'Breakfast', items: [] },
          { name: 'Lunch', items: [] },
        ],
      },
    ],
  },
};

function renderNutritionDay(mode = 'plan', date = '2025-06-01') {
  return render(
    <MemoryRouter initialEntries={[`/member/nutrition/day?date=${date}&mode=${mode}`]}>
      <Routes>
        <Route path="/member/nutrition/day" element={<MemberNutritionDayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberNutritionDayPage', () => {
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

    vi.mocked(useNutritionStore).mockReturnValue({
      templates: [],
      foods: [],
      foodSearchResults: [],
      memberPlans: { 'member-1': samplePlan },
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
  });

  describe('planMode', () => {
    it('renders meal sections from the assigned plan', () => {
      renderNutritionDay('plan');

      // The day type name and meal names from the plan must be visible
      expect(screen.getByText(/training day/i)).toBeInTheDocument();
      expect(screen.getByText(/breakfast/i)).toBeInTheDocument();
      expect(screen.getByText(/lunch/i)).toBeInTheDocument();
    });
  });

  describe('freeMode', () => {
    it('renders freestyle heading for free mode', () => {
      vi.mocked(useNutritionStore).mockReturnValue({
        templates: [],
        foods: [],
        foodSearchResults: [],
        memberPlans: { 'member-1': null },
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

      renderNutritionDay('free');

      expect(screen.getByText(/freestyle/i)).toBeInTheDocument();
    });
  });
});
