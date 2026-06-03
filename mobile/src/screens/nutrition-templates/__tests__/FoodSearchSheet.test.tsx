import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

jest.mock('../../../lib/api/foods.api', () => ({
  createFood: jest.fn(),
}));

import { useFoodsStore } from '../../../stores/foods.store';
import { Food } from '../../../types/nutrition-templates';
import { FoodSearchSheet } from '../components/FoodSearchSheet';

const mockFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    _id: 'food1',
    name: 'Chicken Breast',
    brand: null,
    macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    servings: [],
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupFoodsStore(results: Food[], loading = false) {
  const state = {
    results,
    loading,
    error: null,
    search: jest.fn().mockResolvedValue(undefined),
    addResult: jest.fn(),
  };
  mockFoodsStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') {
      return selector(state as Parameters<typeof selector>[0]);
    }
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('FoodSearchSheet', () => {
  it('typing in the search field calls foods store search (debounced) and renders matching results', () => {
    const foods = [
      makeFood({ _id: 'food1', name: 'Chicken Breast' }),
      makeFood({ _id: 'food2', name: 'Chicken Thigh' }),
    ];
    const { search } = setupFoodsStore(foods);

    const { getByTestId, getByText } = render(
      <FoodSearchSheet onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('food-search-input'), 'chick');
    jest.advanceTimersByTime(350);

    expect(search).toHaveBeenCalledWith('chick');

    expect(getByTestId('food-result-Chicken Breast')).toBeTruthy();
    expect(getByTestId('food-result-Chicken Thigh')).toBeTruthy();
    expect(getByText('Chicken Breast')).toBeTruthy();
  });
});
