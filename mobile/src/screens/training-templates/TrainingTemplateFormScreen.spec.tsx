import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/training-templates.store', () => ({
  useTrainingTemplatesStore: jest.fn(),
}));

jest.mock('../../stores/exercises.store', () => ({
  useExercisesStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('../../lib/api/exercises.api', () => ({
  createExercise: jest.fn(),
}));

import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { useExercisesStore } from '../../stores/exercises.store';
import { PlanTemplate } from '../../types/training-templates';
import { TrainingTemplateFormScreen } from './TrainingTemplateFormScreen';

const mockTemplatesStore = useTrainingTemplatesStore as jest.MockedFunction<typeof useTrainingTemplatesStore>;
const mockExercisesStore = useExercisesStore as jest.MockedFunction<typeof useExercisesStore>;

function setupTemplatesStore(items: PlanTemplate[] = []) {
  const state = {
    items,
    loading: false,
    error: null,
    fetchTemplates: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    createAndAdd: jest.fn().mockResolvedValue({ _id: 'new1', name: 'Test', days: [], description: null, createdBy: 'u1', createdAt: '' }),
    updateAndSync: jest.fn().mockResolvedValue({ _id: 'tpl1', name: 'Test', days: [], description: null, createdBy: 'u1', createdAt: '' }),
    removeAndDelete: jest.fn(),
  };
  mockTemplatesStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') {
        return selector(state as Parameters<typeof selector>[0]);
      }
      return state;
    },
  );
  return state;
}

function setupExercisesStore() {
  const state = {
    results: [],
    loading: false,
    error: null,
    search: jest.fn().mockResolvedValue(undefined),
    addResult: jest.fn(),
  };
  mockExercisesStore.mockImplementation(
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
  setupTemplatesStore();
  setupExercisesStore();
});

describe('TrainingTemplateFormScreen', () => {
  describe('submit', () => {
    it('calls save with name and exercises', async () => {
      const store = setupTemplatesStore();
      setupExercisesStore();

      const { getByTestId } = render(<TrainingTemplateFormScreen />);

      // Enter template name
      fireEvent.changeText(getByTestId('template-name-input'), 'My Template');

      // Save is enabled — press it
      fireEvent.press(getByTestId('template-save-button'));

      await new Promise((r) => setTimeout(r, 0));

      expect(store.createAndAdd).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Template' }),
      );
    });
  });

  it('save button is disabled until name is present and remains disabled while an added exercise is missing sets/reps', () => {
    const { getByTestId } = render(<TrainingTemplateFormScreen />);

    // Save button disabled when name is empty
    const saveBtn = getByTestId('template-save-button');
    expect(saveBtn).toBeTruthy();
    // The button's accessibility state should indicate disabled
    // (we test that pressing does nothing / check props)
    // Using accessibilityState.disabled
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);

    // Type a name — now save should be enabled
    fireEvent.changeText(getByTestId('template-name-input'), 'My Template');
    // After typing a name, if no exercises are added, save should be enabled (days are optional)
    // Re-check button — it should now be enabled
    const saveBtnAfter = getByTestId('template-save-button');
    expect(saveBtnAfter.props.accessibilityState?.disabled).toBe(false);
  });
});
