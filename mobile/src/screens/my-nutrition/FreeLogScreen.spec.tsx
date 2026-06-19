/**
 * Stage 5 unit tests — FreeLogScreen
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
}));

const mockLogFood = jest.fn();
const mockFetchToday = jest.fn();
const mockSearch = jest.fn();

jest.mock('../../stores/self-nutrition.store', () => ({
  useSelfNutritionStore: jest.fn(),
}));

jest.mock('../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useSelfNutritionStore } from '../../stores/self-nutrition.store';
import { useFoodsStore } from '../../stores/foods.store';
import { Food } from '../../types/nutrition-templates';
import { SelfNutritionLog } from '../../types/nutrition';
import { FreeLogScreen } from './FreeLogScreen';

const mockUseSelfNutritionStore = useSelfNutritionStore as jest.MockedFunction<typeof useSelfNutritionStore>;
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

function makeLog(overrides: Partial<SelfNutritionLog> = {}): SelfNutritionLog {
  return {
    date: '2026-06-06',
    items: [],
    totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    ...overrides,
  };
}

function setupSelfNutritionStore(log: SelfNutritionLog | null = null, logging = false) {
  const state = {
    log,
    loading: false,
    logging,
    error: null,
    fetchToday: mockFetchToday,
    logFood: mockLogFood,
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
  mockFetchToday.mockResolvedValue(undefined);
  mockSearch.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FreeLogScreen', () => {
  it('renders the screen with a food search input', () => {
    setupSelfNutritionStore(makeLog());
    setupFoodsStore();

    const { getByTestId } = render(<FreeLogScreen />);

    expect(getByTestId('screen-FreeLog')).toBeTruthy();
    expect(getByTestId('free-log-food-search')).toBeTruthy();
  });

  it('shows a validation message when attempting to log without selecting a food', async () => {
    setupSelfNutritionStore(makeLog());
    setupFoodsStore();

    const { getByTestId, queryByTestId, getByText } = render(<FreeLogScreen />);

    // No food selected — confirm button should show validation message
    await act(async () => {
      fireEvent.press(getByTestId('free-log-confirm'));
    });

    expect(mockLogFood).not.toHaveBeenCalled();
    expect(getByText(/select a food/i)).toBeTruthy();
    expect(queryByTestId('free-log-item-0')).toBeNull();
  });

  it('logging a selected food appends it to today\'s list and shows the new total', async () => {
    const chicken = makeFood({ name: 'Chicken Breast' });
    const logAfter: SelfNutritionLog = {
      date: '2026-06-06',
      items: [{ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 47, carbs: 0, fat: 5 }],
      totals: { kcal: 248, protein: 47, carbs: 0, fat: 5 },
    };

    // After logFood resolves the store state updates
    mockLogFood.mockImplementation(async () => {
      mockUseSelfNutritionStore.mockImplementation(
        (selector?: (s: { log: SelfNutritionLog; loading: boolean; logging: boolean; error: null; fetchToday: jest.Mock; logFood: jest.Mock }) => unknown) => {
          const s = { log: logAfter, loading: false, logging: false, error: null, fetchToday: mockFetchToday, logFood: mockLogFood };
          if (typeof selector === 'function') return selector(s);
          return s;
        },
      );
    });

    setupSelfNutritionStore(makeLog());
    setupFoodsStore([chicken]);

    const { getByTestId, rerender } = render(<FreeLogScreen />);

    // Select a food
    await act(async () => {
      fireEvent.press(getByTestId('free-food-result-Chicken Breast'));
    });

    // Confirm log
    await act(async () => {
      fireEvent.press(getByTestId('free-log-confirm'));
    });

    expect(mockLogFood).toHaveBeenCalledWith(
      expect.objectContaining({
        foodName: 'Chicken Breast',
        quantityG: expect.any(Number),
      }),
    );

    // Re-render with updated store state
    rerender(<FreeLogScreen />);

    expect(getByTestId('free-log-item-0')).toBeTruthy();
    expect(getByTestId('free-log-total-kcal')).toBeTruthy();
  });


  // Stage 10
  it('submit > calls free-log with entered macros', async () => {
    const chicken = makeFood({ name: 'Chicken Breast' });
    setupSelfNutritionStore(makeLog());
    setupFoodsStore([chicken]);
    const { getByTestId } = render(<FreeLogScreen />);
    await act(async () => { fireEvent.press(getByTestId('free-food-result-Chicken Breast')); });
    fireEvent.changeText(getByTestId('free-log-quantity-input'), '150');
    await act(async () => { fireEvent.press(getByTestId('free-log-confirm')); });
    expect(mockLogFood).toHaveBeenCalledWith(expect.objectContaining({ foodName: 'Chicken Breast', quantityG: 150, kcal: expect.any(Number) }));
  });
});
