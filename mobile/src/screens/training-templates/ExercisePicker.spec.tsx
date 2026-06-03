import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/exercises.store', () => ({
  useExercisesStore: jest.fn(),
}));

import { useExercisesStore } from '../../stores/exercises.store';
import { Exercise } from '../../types/training-templates';
import { ExercisePicker } from './ExercisePicker';

const mockExercisesStore = useExercisesStore as jest.MockedFunction<typeof useExercisesStore>;

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    _id: 'ex1',
    name: 'Bench Press',
    muscleGroup: 'Chest',
    isGlobal: true,
    isBodyweight: false,
    ...overrides,
  };
}

function setupExercisesStore(results: Exercise[], loading = false) {
  const state = {
    results,
    loading,
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
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ExercisePicker', () => {
  it('calls exercisesStore.search with the typed query and renders a result row per returned exercise', () => {
    const exercises = [
      makeExercise({ _id: 'ex1', name: 'Bench Press' }),
      makeExercise({ _id: 'ex2', name: 'Squat', muscleGroup: 'Legs' }),
    ];
    const { search } = setupExercisesStore(exercises);
    const onSelect = jest.fn();

    const { getByTestId, getByText } = render(
      <ExercisePicker onSelect={onSelect} onClose={jest.fn()} />,
    );

    // Type a query
    fireEvent.changeText(getByTestId('exercise-search-input'), 'bench');
    // Advance debounce timer
    jest.advanceTimersByTime(350);

    expect(search).toHaveBeenCalledWith('bench');

    // Result rows visible
    expect(getByTestId('exercise-result-Bench Press')).toBeTruthy();
    expect(getByTestId('exercise-result-Squat')).toBeTruthy();
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('Squat')).toBeTruthy();
  });
});
