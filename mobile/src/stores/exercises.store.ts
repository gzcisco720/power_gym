import { create } from 'zustand';
import {
  searchExercises as apiSearchExercises,
} from '../lib/api/exercises.api';
import { Exercise } from '../types/training-templates';

interface ExercisesState {
  results: Exercise[];
  loading: boolean;
  error: string | null;

  search(q: string): Promise<void>;
  addResult(exercise: Exercise): void;
}

export const useExercisesStore = create<ExercisesState>((set) => ({
  results: [],
  loading: false,
  error: null,

  async search(q: string): Promise<void> {
    set({ loading: true, error: null });
    try {
      const results = await apiSearchExercises(q);
      set({ results, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addResult(exercise: Exercise): void {
    set((state) => ({ results: [exercise, ...state.results] }));
  },
}));
