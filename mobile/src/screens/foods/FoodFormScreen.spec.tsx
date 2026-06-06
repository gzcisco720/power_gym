import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

jest.mock('../../lib/api/foods.api', () => ({
  createFood: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockRouteParams: { params: { food?: import('../../types/nutrition-templates').Food } } = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => mockRouteParams,
}));

import { useFoodsStore } from '../../stores/foods.store';
import { createFood } from '../../lib/api/foods.api';
import { Food } from '../../types/nutrition-templates';
import { FoodFormScreen } from './FoodFormScreen';

const mockUseFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;
const mockCreateFood = createFood as jest.MockedFunction<typeof createFood>;

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

function setupStore() {
  const state = {
    results: [],
    loading: false,
    error: null,
    search: jest.fn().mockResolvedValue(undefined),
    addResult: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
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
  mockGoBack.mockClear();
  mockRouteParams.params = {};
  setupStore();
});

describe('FoodFormScreen', () => {
  it('Save button is disabled when name is empty', () => {
    const { getByTestId } = render(<FoodFormScreen />);
    const saveBtn = getByTestId('food-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Save button is disabled until all four core macros are filled', () => {
    const { getByTestId } = render(<FoodFormScreen />);

    fireEvent.changeText(getByTestId('food-name-input'), 'Test Food');
    fireEvent.changeText(getByTestId('food-kcal-input'), '100');
    // protein/carbs/fat not filled yet
    expect(getByTestId('food-save-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('Save button enabled after name + all four macros filled', () => {
    const { getByTestId } = render(<FoodFormScreen />);

    fireEvent.changeText(getByTestId('food-name-input'), 'Test Food');
    fireEvent.changeText(getByTestId('food-kcal-input'), '100');
    fireEvent.changeText(getByTestId('food-protein-input'), '20');
    fireEvent.changeText(getByTestId('food-carbs-input'), '5');
    fireEvent.changeText(getByTestId('food-fat-input'), '2');

    expect(getByTestId('food-save-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('create mode: filling name + four macros and pressing Save calls createFood then goBack', async () => {
    const store = setupStore();
    const createdFood = makeFood({ _id: 'new1', name: 'Test Food' });
    mockCreateFood.mockResolvedValue(createdFood);

    const { getByTestId } = render(<FoodFormScreen />);

    fireEvent.changeText(getByTestId('food-name-input'), 'Test Food');
    fireEvent.changeText(getByTestId('food-kcal-input'), '100');
    fireEvent.changeText(getByTestId('food-protein-input'), '20');
    fireEvent.changeText(getByTestId('food-carbs-input'), '5');
    fireEvent.changeText(getByTestId('food-fat-input'), '2');

    await act(async () => {
      fireEvent.press(getByTestId('food-save-button'));
    });

    expect(mockCreateFood).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Food' }),
    );
    expect(store.addResult).toHaveBeenCalledWith(createdFood);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('edit mode: pre-fills fields from the food param and Save calls store.update with the food _id', async () => {
    const food = makeFood({
      _id: 'food1',
      name: 'Chicken Breast',
      brand: 'FreshFarm',
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    });
    mockRouteParams.params = { food };
    const store = setupStore();

    const { getByTestId } = render(<FoodFormScreen />);

    // Fields should be pre-filled
    expect(getByTestId('food-name-input').props.value).toBe('Chicken Breast');
    expect(getByTestId('food-brand-input').props.value).toBe('FreshFarm');
    expect(getByTestId('food-kcal-input').props.value).toBe('165');
    expect(getByTestId('food-protein-input').props.value).toBe('31');
    expect(getByTestId('food-carbs-input').props.value).toBe('0');
    expect(getByTestId('food-fat-input').props.value).toBe('3.6');

    // Change name and save
    fireEvent.changeText(getByTestId('food-name-input'), 'Grilled Chicken');

    await act(async () => {
      fireEvent.press(getByTestId('food-save-button'));
    });

    expect(store.update).toHaveBeenCalledWith(
      'food1',
      expect.objectContaining({ name: 'Grilled Chicken' }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});
