jest.mock('../lib/api/nutrition.api', () => ({
  fetchMyNutritionPlan: jest.fn(),
  fetchToday: jest.fn(),
  logFood: jest.fn(),
  fetchTodaySummary: jest.fn(),
  assignNutritionPlan: jest.fn(),
  fetchMemberNutritionHistory: jest.fn(),
}));

import * as nutritionApi from '../lib/api/nutrition.api';
import { useNutritionStore } from './nutrition.store';
import {
  ActiveNutritionPlan,
  NutritionDailyLog,
  MacroSummary,
  LogFoodInput,
} from '../types/nutrition';

const mockFetchMyNutritionPlan = nutritionApi.fetchMyNutritionPlan as jest.MockedFunction<
  typeof nutritionApi.fetchMyNutritionPlan
>;
const mockFetchToday = nutritionApi.fetchToday as jest.MockedFunction<typeof nutritionApi.fetchToday>;
const mockLogFood = nutritionApi.logFood as jest.MockedFunction<typeof nutritionApi.logFood>;
const mockFetchTodaySummary = nutritionApi.fetchTodaySummary as jest.MockedFunction<
  typeof nutritionApi.fetchTodaySummary
>;

const MOCK_PLAN: ActiveNutritionPlan = {
  _id: 'plan1',
  name: 'Cut Plan',
  templateId: 'tpl1',
  assignedAt: '2024-01-01T00:00:00.000Z',
  dayTypes: [
    {
      name: 'Training Day',
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }],
        },
      ],
    },
  ],
  todayDayTypeName: 'Training Day',
};

const MOCK_LOG: NutritionDailyLog = {
  _id: 'log1',
  memberId: 'mem1',
  planId: 'plan1',
  date: '2024-01-02',
  dayTypeName: 'Training Day',
  meals: [
    {
      name: 'Breakfast',
      order: 1,
      items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }],
    },
  ],
};

const MOCK_SUMMARY: MacroSummary = {
  logged: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
  target: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
};

const EMPTY_LOG: NutritionDailyLog = {
  _id: 'log1',
  memberId: 'mem1',
  planId: 'plan1',
  date: '2024-01-02',
  dayTypeName: 'Training Day',
  meals: [{ name: 'Breakfast', order: 1, items: [] }],
};

function resetStore() {
  useNutritionStore.setState({ plan: null, todayLog: null, summary: null, loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useNutritionStore', () => {
  describe('fetchToday', () => {
    it('populates plan, todayLog and summary and clears loading on success', async () => {
      mockFetchMyNutritionPlan.mockResolvedValueOnce(MOCK_PLAN);
      mockFetchToday.mockResolvedValueOnce(MOCK_LOG);
      mockFetchTodaySummary.mockResolvedValueOnce(MOCK_SUMMARY);

      await useNutritionStore.getState().fetchToday();

      const state = useNutritionStore.getState();
      expect(state.plan).toEqual(MOCK_PLAN);
      expect(state.todayLog).toEqual(MOCK_LOG);
      expect(state.summary).toEqual(MOCK_SUMMARY);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the API rejects', async () => {
      mockFetchMyNutritionPlan.mockRejectedValueOnce(new Error('Network error'));

      await useNutritionStore.getState().fetchToday();

      const state = useNutritionStore.getState();
      expect(state.plan).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('logFood', () => {
    it('calls the log endpoint then refetches summary so totals reflect the new item', async () => {
      const input: LogFoodInput = {
        mealName: 'Breakfast',
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      };
      const updatedLog: NutritionDailyLog = {
        ...EMPTY_LOG,
        meals: [{ name: 'Breakfast', order: 1, items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }] }],
      };
      const updatedSummary: MacroSummary = {
        logged: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
        target: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
      };
      mockLogFood.mockResolvedValueOnce(updatedLog);
      mockFetchTodaySummary.mockResolvedValueOnce(updatedSummary);

      await useNutritionStore.getState().logFood(input);

      expect(mockLogFood).toHaveBeenCalledWith(input);
      expect(mockFetchTodaySummary).toHaveBeenCalled();

      const state = useNutritionStore.getState();
      expect(state.todayLog).toEqual(updatedLog);
      expect(state.summary).toEqual(updatedSummary);
    });
  });

  describe('loggedItemCount', () => {
    it('returns the total number of logged items across all meals', () => {
      const log: NutritionDailyLog = {
        _id: 'log1',
        memberId: 'mem1',
        planId: 'plan1',
        date: '2024-01-02',
        dayTypeName: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              { foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 },
              { foodName: 'Milk', quantityG: 200, kcal: 100, protein: 7, carbs: 10, fat: 3 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [{ foodName: 'Chicken', quantityG: 150, kcal: 250, protein: 35, carbs: 0, fat: 8 }],
          },
        ],
      };
      useNutritionStore.setState({ todayLog: log });

      const count = useNutritionStore.getState().loggedItemCount();

      expect(count).toBe(3);
    });

    it('returns 0 when there is no today log', () => {
      useNutritionStore.setState({ todayLog: null });

      const count = useNutritionStore.getState().loggedItemCount();

      expect(count).toBe(0);
    });
  });

  describe('integration: fetchToday + summary', () => {
    it('after fetchToday resolves, summary.logged.kcal is exposed and matches the API payload', async () => {
      mockFetchMyNutritionPlan.mockResolvedValueOnce(MOCK_PLAN);
      mockFetchToday.mockResolvedValueOnce(MOCK_LOG);
      mockFetchTodaySummary.mockResolvedValueOnce(MOCK_SUMMARY);

      await useNutritionStore.getState().fetchToday();

      const { summary } = useNutritionStore.getState();
      expect(summary?.logged.kcal).toBe(MOCK_SUMMARY.logged.kcal);
    });
  });

  describe('integration: logFood + summary update', () => {
    it('after logFood, summary reflects updated logged totals', async () => {
      // Setup: pre-populate store with empty log and zero summary
      useNutritionStore.setState({ todayLog: EMPTY_LOG, summary: { logged: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, target: { kcal: 300, protein: 10, carbs: 54, fat: 6 } } });

      const input: LogFoodInput = {
        mealName: 'Breakfast',
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      };
      const updatedLog: NutritionDailyLog = {
        ...EMPTY_LOG,
        meals: [{ name: 'Breakfast', order: 1, items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }] }],
      };
      const updatedSummary: MacroSummary = {
        logged: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
        target: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
      };
      mockLogFood.mockResolvedValueOnce(updatedLog);
      mockFetchTodaySummary.mockResolvedValueOnce(updatedSummary);

      await useNutritionStore.getState().logFood(input);

      const { summary } = useNutritionStore.getState();
      expect(summary?.logged.kcal).toBe(300);
    });
  });
});

// Silence unused mock warnings
void mockFetchMyNutritionPlan;
void mockFetchToday;
void mockLogFood;
void mockFetchTodaySummary;
