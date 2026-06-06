jest.mock('../lib/api/nutrition.api', () => ({
  fetchSelfToday: jest.fn(),
  logSelfFood: jest.fn(),
}));

import * as nutritionApi from '../lib/api/nutrition.api';
import { useSelfNutritionStore } from './self-nutrition.store';
import { SelfNutritionLog, LogSelfFoodInput } from '../types/nutrition';

const mockFetchSelfToday = nutritionApi.fetchSelfToday as jest.MockedFunction<
  typeof nutritionApi.fetchSelfToday
>;
const mockLogSelfFood = nutritionApi.logSelfFood as jest.MockedFunction<
  typeof nutritionApi.logSelfFood
>;

const EMPTY_LOG: SelfNutritionLog = {
  date: '2026-06-06',
  items: [],
  totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
};

const LOG_WITH_ITEM: SelfNutritionLog = {
  date: '2026-06-06',
  items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }],
  totals: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
};

function resetStore() {
  useSelfNutritionStore.setState({ log: null, loading: false, logging: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useSelfNutritionStore', () => {
  describe('fetchToday', () => {
    it('populates the self log items and totals on success', async () => {
      mockFetchSelfToday.mockResolvedValueOnce(LOG_WITH_ITEM);

      await useSelfNutritionStore.getState().fetchToday();

      const state = useSelfNutritionStore.getState();
      expect(state.log).toEqual(LOG_WITH_ITEM);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error state when the API rejects', async () => {
      mockFetchSelfToday.mockRejectedValueOnce(new Error('Network error'));

      await useSelfNutritionStore.getState().fetchToday();

      const state = useSelfNutritionStore.getState();
      expect(state.log).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('logFood', () => {
    it('appends the logged item and updates totals on success', async () => {
      useSelfNutritionStore.setState({ log: EMPTY_LOG });
      mockLogSelfFood.mockResolvedValueOnce(LOG_WITH_ITEM);

      const input: LogSelfFoodInput = {
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      };

      await useSelfNutritionStore.getState().logFood(input);

      const state = useSelfNutritionStore.getState();
      expect(mockLogSelfFood).toHaveBeenCalledWith(input);
      expect(state.log).toEqual(LOG_WITH_ITEM);
      expect(state.logging).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error state on api failure', async () => {
      useSelfNutritionStore.setState({ log: EMPTY_LOG });
      mockLogSelfFood.mockRejectedValueOnce(new Error('Server error'));

      const input: LogSelfFoodInput = {
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      };

      await useSelfNutritionStore.getState().logFood(input);

      const state = useSelfNutritionStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.logging).toBe(false);
    });
  });
});
