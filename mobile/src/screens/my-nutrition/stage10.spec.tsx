/**
 * Stage 10 Sprint Contract tests — my-nutrition
 *
 * Verifies:
 * 2. LogFoodScreen > submit > calls log with selected food and quantity
 * 3. FreeLogScreen > submit > calls free-log with entered macros
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { mealName: 'Breakfast' } }),
}));

const mockLogFood = jest.fn();
const mockFreeLogFood = jest.fn();
const mockFetchToday = jest.fn();
const mockSearch = jest.fn();

jest.mock('../../stores/nutrition.store', () => ({
  useNutritionStore: jest.fn(),
}));

jest.mock('../../stores/self-nutrition.store', () => ({
  useSelfNutritionStore: jest.fn(),
}));

jest.mock('../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useNutritionStore } from '../../stores/nutrition.store';
import { useSelfNutritionStore } from '../../stores/self-nutrition.store';
import { useFoodsStore } from '../../stores/foods.store';
import { Food } from '../../types/nutrition-templates';
import { LogFoodScreen } from './LogFoodScreen';
import { FreeLogScreen } from './FreeLogScreen';

const mockUseNutritionStore = useNutritionStore as jest.MockedFunction<typeof useNutritionStore>;
const mockUseSelfNutritionStore = useSelfNutritionStore as jest.MockedFunction<typeof useSelfNutritionStore>;
const mockUseFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    _id: 'food1',
    name: 'Chicken Breast',
    brand: null,
    macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    servings: [],
    createdBy: 'owner1',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupNutritionStore() {
  const state = {
    plan: null,
    todayLog: null,
    summary: null,
    loading: false,
    error: null,
    fetchToday: jest.fn(),
    logFood: mockLogFood,
    loggedItemCount: jest.fn().mockReturnValue(0),
  };

  mockUseNutritionStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupSelfNutritionStore(logging = false) {
  const state = {
    log: null,
    loading: false,
    logging,
    error: null,
    fetchToday: mockFetchToday,
    logFood: mockFreeLogFood,
  };

  mockUseSelfNutritionStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupFoodsStore(results: Food[] = [], loading = false) {
  const state = {
    results,
    loading,
    search: mockSearch,
    addResult: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    error: null,
  };

  mockUseFoodsStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogFood.mockResolvedValue(undefined);
  mockFreeLogFood.mockResolvedValue(undefined);
  mockFetchToday.mockResolvedValue(undefined);
  mockSearch.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LogFoodScreen', () => {
  describe('submit', () => {
    it('calls log with selected food and quantity', async () => {
      const chicken = makeFood({ name: 'Chicken Breast' });
      setupNutritionStore();
      setupFoodsStore([chicken]);

      const { getByTestId } = render(<LogFoodScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('food-result-Chicken Breast'));
      });

      fireEvent.changeText(getByTestId('quantity-input'), '150');

      await act(async () => {
        fireEvent.press(getByTestId('confirm-log-food'));
      });

      expect(mockLogFood).toHaveBeenCalledWith(
        expect.objectContaining({
          mealName: 'Breakfast',
          foodName: 'Chicken Breast',
          quantityG: 150,
          kcal: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number),
        }),
      );
    });
  });
});

describe('FreeLogScreen', () => {
  describe('submit', () => {
    it('calls free-log with entered macros', async () => {
      const chicken = makeFood({ name: 'Chicken Breast' });
      setupSelfNutritionStore();
      setupFoodsStore([chicken]);

      const { getByTestId } = render(<FreeLogScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('free-food-result-Chicken Breast'));
      });

      fireEvent.changeText(getByTestId('free-log-quantity-input'), '150');

      await act(async () => {
        fireEvent.press(getByTestId('free-log-confirm'));
      });

      expect(mockFreeLogFood).toHaveBeenCalledWith(
        expect.objectContaining({
          foodName: 'Chicken Breast',
          quantityG: 150,
          kcal: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number),
        }),
      );
    });
  });
});
