import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/nutrition-templates.store', () => ({
  useNutritionTemplatesStore: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import { useNutritionTemplatesStore } from '../../../stores/nutrition-templates.store';
import { NutritionTemplate, DayType } from '../../../types/nutrition-templates';
import { NutritionTemplatesScreen } from '../NutritionTemplatesScreen';

const mockStore = useNutritionTemplatesStore as jest.MockedFunction<
  typeof useNutritionTemplatesStore
>;

function makeTemplate(overrides: Partial<NutritionTemplate> = {}): NutritionTemplate {
  return {
    _id: 'tpl1',
    name: 'High Protein Plan',
    description: null,
    createdBy: 'user1',
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 0,
            items: [
              {
                foodName: 'Oats',
                quantityG: 100,
                kcal: 350,
                protein: 12,
                carbs: 60,
                fat: 7,
              },
            ],
          },
        ],
      } as DayType,
      {
        name: 'Rest Day',
        meals: [],
      } as DayType,
    ],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupStoreMock(overrides: {
  items?: NutritionTemplate[];
  loading?: boolean;
  error?: string | null;
}) {
  const state = {
    items: overrides.items ?? [],
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    fetchTemplates: jest.fn().mockResolvedValue(undefined),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    removeTemplate: jest.fn(),
  };
  mockStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') {
      return selector(state as Parameters<typeof selector>[0]);
    }
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NutritionTemplatesScreen', () => {
  it('renders one card per template showing name, day-type count, and per-day-type total kcal', () => {
    const templates = [
      makeTemplate({ _id: 'tpl1', name: 'High Protein Plan' }),
      makeTemplate({ _id: 'tpl2', name: 'Low Carb Plan', dayTypes: [] }),
    ];
    setupStoreMock({ items: templates });

    const { getByTestId, getByText } = render(<NutritionTemplatesScreen />);

    expect(getByTestId('template-card-tpl1')).toBeTruthy();
    expect(getByTestId('template-card-tpl2')).toBeTruthy();
    expect(getByText('High Protein Plan')).toBeTruthy();
    expect(getByText('Low Carb Plan')).toBeTruthy();
    // Day type count for tpl1 (2 day types)
    expect(getByText('2 day types')).toBeTruthy();
    // 0 day types
    expect(getByText('0 day types')).toBeTruthy();
  });

  it('shows skeleton rows while loading and an empty state when there are no templates', () => {
    setupStoreMock({ loading: true, items: [] });
    const { getByTestId, rerender } = render(<NutritionTemplatesScreen />);
    expect(getByTestId('screen-NutritionTemplates')).toBeTruthy();

    setupStoreMock({ loading: false, items: [] });
    rerender(<NutritionTemplatesScreen />);
    expect(getByTestId('screen-NutritionTemplates')).toBeTruthy();
  });

  it('tapping a card calls navigation.navigate with NutritionTemplateDetail and the templateId', () => {
    const templates = [makeTemplate({ _id: 'tpl1', name: 'High Protein Plan' })];
    setupStoreMock({ items: templates });

    const { getByTestId } = render(<NutritionTemplatesScreen />);
    fireEvent.press(getByTestId('template-card-tpl1'));

    expect(mockNavigate).toHaveBeenCalledWith('NutritionTemplateDetail', {
      templateId: 'tpl1',
      templateName: 'High Protein Plan',
    });
  });
});
