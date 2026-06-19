import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/training-templates.store', () => ({
  useTrainingTemplatesStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: { templateId: 'tpl1', templateName: 'Push Pull Legs' },
  }),
}));

import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { PlanTemplate } from '../../types/training-templates';
import { TrainingTemplateDetailScreen } from './TrainingTemplateDetailScreen';

const mockStore = useTrainingTemplatesStore as jest.MockedFunction<typeof useTrainingTemplatesStore>;

function makeTemplate(overrides: Partial<PlanTemplate> = {}): PlanTemplate {
  return {
    _id: 'tpl1',
    name: 'Push Pull Legs',
    description: 'Classic PPL',
    createdBy: 'user1',
    days: [
      {
        dayNumber: 1,
        name: 'Push Day',
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

function setupStoreMock(items: PlanTemplate[]) {
  const state = {
    items,
    loading: false,
    error: null,
    fetchTemplates: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    createAndAdd: jest.fn(),
    updateAndSync: jest.fn(),
    removeAndDelete: jest.fn().mockResolvedValue(undefined),
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

describe('TrainingTemplateDetailScreen', () => {
  describe('delete', () => {
    it('opens Reusables Dialog and confirms', async () => {
      const template = makeTemplate();
      const state = setupStoreMock([template]);

      const { getByTestId } = render(<TrainingTemplateDetailScreen />);

      // Tap delete button
      fireEvent.press(getByTestId('template-delete-button'));

      // Dialog confirm button appears
      expect(getByTestId('template-delete-confirm')).toBeTruthy();

      // Confirm delete
      fireEvent.press(getByTestId('template-delete-confirm'));

      await new Promise((r) => setTimeout(r, 0));

      expect(state.removeAndDelete).toHaveBeenCalledWith('tpl1');
    });
  });

  it('renders each day with its exercises showing "sets × repsMin–repsMax" and opens the confirm dialog when delete is pressed', () => {
    const template = makeTemplate();
    setupStoreMock([template]);

    const { getByTestId, getByText } = render(<TrainingTemplateDetailScreen />);

    expect(getByTestId('screen-TrainingTemplateDetail')).toBeTruthy();
    // Day name
    expect(getByText('Push Day')).toBeTruthy();
    // Exercise format: "3 × 8–12"
    expect(getByText('3 × 8–12')).toBeTruthy();
    // Exercise name
    expect(getByText('Bench Press')).toBeTruthy();

    // Tap delete to open dialog
    fireEvent.press(getByTestId('template-delete-button'));
    // Dialog confirm button should appear
    expect(getByTestId('template-delete-confirm')).toBeTruthy();
  });
});
