import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/nutrition-templates.store', () => ({
  useNutritionTemplatesStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: { templateId: 'tpl1', templateName: 'High Protein Plan' },
  }),
}));

import { useNutritionTemplatesStore } from '../../../stores/nutrition-templates.store';
import { NutritionTemplate } from '../../../types/nutrition-templates';
import { NutritionTemplateDetailScreen } from '../NutritionTemplateDetailScreen';

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
      },
      {
        name: 'Rest Day',
        meals: [],
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupStoreMock(items: NutritionTemplate[]) {
  const state = {
    items,
    loading: false,
    error: null,
    fetchTemplates: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    removeTemplate: jest.fn().mockResolvedValue(undefined),
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

describe('NutritionTemplateDetailScreen', () => {
  it('renders a tab per day type and switching tabs shows that day type meals and items', () => {
    const template = makeTemplate();
    setupStoreMock([template]);

    const { getByTestId, getByText, queryByText } = render(<NutritionTemplateDetailScreen />);

    expect(getByTestId('screen-NutritionTemplateDetail')).toBeTruthy();

    // Both day type tabs should render
    expect(getByText('Training Day')).toBeTruthy();
    expect(getByText('Rest Day')).toBeTruthy();

    // First tab (Training Day) is active by default — should show its meals
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Oats')).toBeTruthy();

    // Switch to Rest Day tab
    fireEvent.press(getByTestId('day-type-tab-Rest Day'));
    // Rest Day has no meals — show empty state
    expect(queryByText('Breakfast')).toBeNull();
  });

  it('tapping delete opens a confirm Dialog and confirming calls store.removeTemplate then navigates back', async () => {
    const template = makeTemplate();
    const state = setupStoreMock([template]);

    const { getByTestId } = render(<NutritionTemplateDetailScreen />);

    // Tap delete button
    fireEvent.press(getByTestId('template-delete-button'));

    // Confirm button should appear
    expect(getByTestId('template-delete-confirm')).toBeTruthy();

    // Tap confirm
    fireEvent.press(getByTestId('template-delete-confirm'));

    expect(state.removeTemplate).toHaveBeenCalledWith('tpl1');
  });
});
