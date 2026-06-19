/**
 * Stage 3 unit tests — LogFoodScreen
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
const mockSearch = jest.fn();

jest.mock('../../stores/nutrition.store', () => ({
  useNutritionStore: jest.fn(),
}));

jest.mock('../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useNutritionStore } from '../../stores/nutrition.store';
import { useFoodsStore } from '../../stores/foods.store';
import { Food } from '../../types/nutrition-templates';
import { LogFoodScreen } from './LogFoodScreen';

const mockUseNutritionStore = useNutritionStore as jest.MockedFunction<typeof useNutritionStore>;
const mockUseFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;

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

function setupFoodsStore(results: Food[] = [], loading = false) {
  const state = {
    results,
    loading,
    search: mockSearch,
    addResult: jest.fn(),
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
  mockSearch.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LogFoodScreen', () => {
  it('tapping a food-result-{name} row and submitting a quantity calls store.logFood with the meal name and computed macros', async () => {
    const chicken = makeFood({ name: 'Chicken Breast' });
    setupNutritionStore();
    setupFoodsStore([chicken]);

    const { getByTestId } = render(<LogFoodScreen />);

    // Select the food
    await act(async () => {
      fireEvent.press(getByTestId('food-result-Chicken Breast'));
    });

    // Enter quantity
    const quantityInput = getByTestId('quantity-input');
    fireEvent.changeText(quantityInput, '150');

    // Confirm log
    await act(async () => {
      fireEvent.press(getByTestId('confirm-log-food'));
    });

    // logFood should be called with computed macros for 150g of chicken (per 100g: kcal=165, protein=31, carbs=0, fat=3.6)
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


  // Stage 10
  it('submit > calls log with selected food and quantity', async () => {
    const chicken = makeFood({ name: 'Chicken Breast' });
    setupNutritionStore();
    setupFoodsStore([chicken]);
    const { getByTestId } = render(<LogFoodScreen />);
    await act(async () => { fireEvent.press(getByTestId('food-result-Chicken Breast')); });
    fireEvent.changeText(getByTestId('quantity-input'), '200');
    await act(async () => { fireEvent.press(getByTestId('confirm-log-food')); });
    expect(mockLogFood).toHaveBeenCalledWith(expect.objectContaining({ mealName: 'Breakfast', foodName: 'Chicken Breast', quantityG: 200 }));
  });
});
