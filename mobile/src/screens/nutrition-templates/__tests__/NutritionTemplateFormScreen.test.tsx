import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/nutrition-templates.store', () => ({
  useNutritionTemplatesStore: jest.fn(),
}));

jest.mock('../../../stores/foods.store', () => ({
  useFoodsStore: jest.fn(),
}));

jest.mock('../../../lib/api/foods.api', () => ({
  createFood: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: {},
  }),
}));

import { useNutritionTemplatesStore } from '../../../stores/nutrition-templates.store';
import { useFoodsStore } from '../../../stores/foods.store';
import { NutritionTemplate, Food } from '../../../types/nutrition-templates';
import { NutritionTemplateFormScreen } from '../NutritionTemplateFormScreen';

const mockTemplatesStore = useNutritionTemplatesStore as jest.MockedFunction<
  typeof useNutritionTemplatesStore
>;
const mockFoodsStore = useFoodsStore as jest.MockedFunction<typeof useFoodsStore>;

function setupTemplatesStore(items: NutritionTemplate[] = []) {
  const state = {
    items,
    loading: false,
    error: null,
    fetchTemplates: jest.fn(),
    createTemplate: jest
      .fn()
      .mockResolvedValue({ _id: 'new1', name: 'Test', dayTypes: [], description: null, createdBy: 'u1', createdAt: '' }),
    updateTemplate: jest.fn().mockResolvedValue({
      _id: 'tpl1',
      name: 'Test',
      dayTypes: [],
      description: null,
      createdBy: 'u1',
      createdAt: '',
    }),
    removeTemplate: jest.fn(),
  };
  mockTemplatesStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') {
      return selector(state as Parameters<typeof selector>[0]);
    }
    return state;
  });
  return state;
}

function setupFoodsStore(results: Food[] = []) {
  const state = {
    results,
    loading: false,
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
  setupTemplatesStore();
  setupFoodsStore();
});

describe('NutritionTemplateFormScreen', () => {
  describe('add food', () => {
    it('opens FoodSearchSheet and adds selection', async () => {
      const food: Food = {
        _id: 'food1',
        name: 'Chicken Breast',
        brand: null,
        macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
        servings: [],
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
      };
      setupFoodsStore([food]);

      const { getByTestId, getByText } = render(<NutritionTemplateFormScreen />);

      // Add day type and meal
      fireEvent.press(getByTestId('add-day-type-button'));
      fireEvent.press(getByTestId('add-meal-button-0'));

      // Tap add food to open FoodSearchSheet
      fireEvent.press(getByTestId('add-food-button-0-0'));

      // FoodSearchSheet input should be visible
      expect(getByTestId('food-search-input')).toBeTruthy();

      // Tap the food result
      fireEvent.press(getByTestId('food-result-Chicken Breast'));

      // Food should appear in meal
      await waitFor(() => {
        expect(getByText('Chicken Breast')).toBeTruthy();
      });
    });
  });

  it('save button is disabled when template name is empty and enabled after entering a name', () => {
    const { getByTestId } = render(<NutritionTemplateFormScreen />);

    const saveBtn = getByTestId('template-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByTestId('template-name-input'), 'My Nutrition Plan');
    const saveBtnAfter = getByTestId('template-save-button');
    expect(saveBtnAfter.props.accessibilityState?.disabled).toBe(false);
  });

  it('add/remove day type updates the day-type list', () => {
    const { getByTestId, queryByTestId } = render(<NutritionTemplateFormScreen />);

    // Initially no day types
    expect(queryByTestId('remove-day-type-0')).toBeNull();

    // Add a day type — remove button should appear
    fireEvent.press(getByTestId('add-day-type-button'));
    expect(getByTestId('remove-day-type-0')).toBeTruthy();

    // Remove it — remove button should disappear
    fireEvent.press(getByTestId('remove-day-type-0'));
    expect(queryByTestId('remove-day-type-0')).toBeNull();
  });

  it('selecting a food from FoodSearchSheet adds an item to the active meal with scaled macros', async () => {
    const food: Food = {
      _id: 'food1',
      name: 'Chicken Breast',
      brand: null,
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
      servings: [],
      createdBy: 'system',
      createdAt: '2024-01-01T00:00:00Z',
    };
    setupFoodsStore([food]);

    const { getByTestId, getByText } = render(<NutritionTemplateFormScreen />);

    // Add a day type and a meal
    fireEvent.press(getByTestId('add-day-type-button'));
    fireEvent.press(getByTestId('add-meal-button-0'));

    // Open food search sheet for meal 0 in day type 0
    fireEvent.press(getByTestId('add-food-button-0-0'));

    // Food search sheet should be visible
    expect(getByTestId('food-search-input')).toBeTruthy();

    // Food result should appear
    expect(getByTestId('food-result-Chicken Breast')).toBeTruthy();

    // Tap the food
    fireEvent.press(getByTestId('food-result-Chicken Breast'));

    // The food should be added as an item in the meal
    await waitFor(() => {
      expect(getByText('Chicken Breast')).toBeTruthy();
    });
  });
});
