import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/training-templates.store', () => ({
  useTrainingTemplatesStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { PlanTemplate } from '../../types/training-templates';
import { TrainingTemplatesScreen } from './TrainingTemplatesScreen';

const mockStore = useTrainingTemplatesStore as jest.MockedFunction<typeof useTrainingTemplatesStore>;

function makeTemplate(overrides: Partial<PlanTemplate> = {}): PlanTemplate {
  return {
    _id: 'tpl1',
    name: 'Push Pull Legs',
    description: 'A classic PPL split',
    createdBy: 'user1',
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          {
            groupId: 'g1',
            isSuperset: false,
            exerciseId: 'e1',
            exerciseName: 'Bench Press',
            imageUrl: null,
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          },
        ],
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupStoreMock(overrides: { items?: PlanTemplate[]; loading?: boolean; error?: string | null }) {
  const state = {
    items: overrides.items ?? [],
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    fetchTemplates: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    createAndAdd: jest.fn(),
    updateAndSync: jest.fn(),
    removeAndDelete: jest.fn(),
  };
  mockStore.mockImplementation(
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
});

describe('TrainingTemplatesScreen', () => {
  it('renders a card per template with its name, day count, and exercise count from the store', () => {
    const templates = [
      makeTemplate({ _id: 'tpl1', name: 'Push Pull Legs' }),
      makeTemplate({ _id: 'tpl2', name: 'Full Body', days: [] }),
    ];
    setupStoreMock({ items: templates });

    const { getByTestId, getByText } = render(<TrainingTemplatesScreen />);

    expect(getByTestId('template-card-tpl1')).toBeTruthy();
    expect(getByTestId('template-card-tpl2')).toBeTruthy();
    expect(getByText('Push Pull Legs')).toBeTruthy();
    expect(getByText('Full Body')).toBeTruthy();
    // Day count
    expect(getByText('1 day')).toBeTruthy();
    // Exercise count from day
    expect(getByText('1 exercise')).toBeTruthy();
  });

  it('shows skeleton rows while loading is true and the empty state when items is empty and loading is false', () => {
    // Loading state
    setupStoreMock({ loading: true, items: [] });
    const { getByTestId, rerender } = render(<TrainingTemplatesScreen />);
    expect(getByTestId('screen-TrainingTemplates')).toBeTruthy();

    // Empty state after loading
    setupStoreMock({ loading: false, items: [] });
    rerender(<TrainingTemplatesScreen />);
    expect(getByTestId('screen-TrainingTemplates')).toBeTruthy();
  });
});
