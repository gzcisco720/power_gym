import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockNavigate = jest.fn();

import { useFoodsStore } from '../../stores/foods.store';
import { Food } from '../../types/nutrition-templates';
import { FoodsScreen } from './FoodsScreen';

const mockUseFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    _id: 'food1',
    name: 'Chicken Breast',
    brand: 'FreshFarm',
    macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    servings: [],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupStore(overrides: Partial<{
  results: Food[];
  loading: boolean;
  error: string | null;
  search: jest.Mock;
  remove: jest.Mock;
}> = {}) {
  const state = {
    results: overrides.results ?? [],
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    search: overrides.search ?? jest.fn().mockResolvedValue(undefined),
    remove: overrides.remove ?? jest.fn().mockResolvedValue(undefined),
    addResult: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
  mockUseFoodsStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') {
        return selector(state as Parameters<typeof selector>[0]);
      }
      return state;
    },
  );
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
});

describe('FoodsScreen', () => {
  it('renders a FoodCard per item in store.results with its name visible', () => {
    const foods = [
      makeFood({ _id: 'f1', name: 'Chicken Breast' }),
      makeFood({ _id: 'f2', name: 'Brown Rice' }),
    ];
    setupStore({ results: foods });

    const { getByText, getByTestId } = render(<FoodsScreen />);
    expect(getByText('Chicken Breast')).toBeTruthy();
    expect(getByText('Brown Rice')).toBeTruthy();
    expect(getByTestId('food-card-f1')).toBeTruthy();
    expect(getByTestId('food-card-f2')).toBeTruthy();
  });

  it('shows the empty state text when results is empty and not loading', () => {
    setupStore({ results: [], loading: false });
    const { getByText } = render(<FoodsScreen />);
    expect(getByText('No foods found.')).toBeTruthy();
  });

  it('typing in the search input calls store.search with the query after the 300ms debounce', async () => {
    jest.useFakeTimers();
    const search = jest.fn().mockResolvedValue(undefined);
    setupStore({ search });

    const { getByTestId } = render(<FoodsScreen />);
    fireEvent.changeText(getByTestId('foods-search-input'), 'chick');

    // Before debounce
    expect(search).not.toHaveBeenCalledWith('chick');

    // After 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(search).toHaveBeenCalledWith('chick');

    jest.useRealTimers();
  });

  it('tapping the add button navigates to FoodForm with no food param', () => {
    setupStore();
    const { getByTestId } = render(<FoodsScreen />);
    fireEvent.press(getByTestId('foods-add-button'));
    expect(mockNavigate).toHaveBeenCalledWith('FoodForm', {});
  });

  it('tapping a food card navigates to FoodForm with that food as param', () => {
    const food = makeFood({ _id: 'f1', name: 'Chicken Breast' });
    setupStore({ results: [food] });

    const { getByTestId } = render(<FoodsScreen />);
    fireEvent.press(getByTestId('food-card-f1'));
    expect(mockNavigate).toHaveBeenCalledWith('FoodForm', { food });
  });

  it('confirming the delete dialog calls store.remove with the food _id', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const food = makeFood({ _id: 'f1', name: 'Chicken Breast' });
    setupStore({ results: [food], remove });

    const { getByTestId } = render(<FoodsScreen />);

    // Tap delete button on card
    fireEvent.press(getByTestId('food-delete-f1'));

    // Confirm dialog appears — tap confirm
    await act(async () => {
      fireEvent.press(getByTestId('food-delete-confirm'));
    });

    expect(remove).toHaveBeenCalledWith('f1');
  });
});
