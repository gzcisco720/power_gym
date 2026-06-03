jest.mock('../lib/api/exercises.api', () => ({
  searchExercises: jest.fn(),
  createExercise: jest.fn(),
}));

import * as exercisesApi from '../lib/api/exercises.api';
import { useExercisesStore } from './exercises.store';
import { Exercise } from '../types/training-templates';

const mockSearchExercises = exercisesApi.searchExercises as jest.MockedFunction<
  typeof exercisesApi.searchExercises
>;
const mockCreateExercise = exercisesApi.createExercise as jest.MockedFunction<
  typeof exercisesApi.createExercise
>;

const MOCK_EXERCISE_1: Exercise = {
  _id: 'ex1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  isGlobal: true,
  isBodyweight: false,
};

const MOCK_EXERCISE_2: Exercise = {
  _id: 'ex2',
  name: 'Squat',
  muscleGroup: 'Legs',
  isGlobal: true,
  isBodyweight: false,
};

function resetStore() {
  useExercisesStore.setState({ results: [], loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useExercisesStore', () => {
  describe('search', () => {
    it('stores returned results and clears loading on success', async () => {
      mockSearchExercises.mockResolvedValueOnce([MOCK_EXERCISE_1, MOCK_EXERCISE_2]);

      await useExercisesStore.getState().search('bench');

      const state = useExercisesStore.getState();
      expect(state.results).toEqual([MOCK_EXERCISE_1, MOCK_EXERCISE_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      mockSearchExercises.mockRejectedValueOnce(new Error('Network error'));

      await useExercisesStore.getState().search('bench');

      const state = useExercisesStore.getState();
      expect(state.results).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addResult', () => {
    it('prepends the new exercise to results', () => {
      useExercisesStore.setState({ results: [MOCK_EXERCISE_2] });

      useExercisesStore.getState().addResult(MOCK_EXERCISE_1);

      const state = useExercisesStore.getState();
      expect(state.results[0]).toEqual(MOCK_EXERCISE_1);
      expect(state.results[1]).toEqual(MOCK_EXERCISE_2);
      expect(state.results).toHaveLength(2);
    });
  });
});

// Silence unused mock warning
void mockCreateExercise;
