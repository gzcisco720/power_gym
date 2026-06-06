import { create } from 'zustand';
import { fetchMemberProgress, fetchExerciseHistory } from '../lib/api/member-progress.api';
import { MemberProgress, ExerciseSessionHistory } from '../types/member-progress';

interface MemberProgressState {
  progressByMember: Record<string, MemberProgress>;
  historyByExercise: Record<string, ExerciseSessionHistory>;
  loadingProgress: boolean;
  loadingHistory: boolean;
  error: string | null;

  fetchProgress(memberId: string): Promise<void>;
  fetchExerciseHistory(memberId: string, exerciseId: string): Promise<void>;
}

export const useMemberProgressStore = create<MemberProgressState>((set) => ({
  progressByMember: {},
  historyByExercise: {},
  loadingProgress: false,
  loadingHistory: false,
  error: null,

  async fetchProgress(memberId: string): Promise<void> {
    set({ loadingProgress: true, error: null });
    try {
      const progress = await fetchMemberProgress(memberId);
      set((state) => ({
        progressByMember: { ...state.progressByMember, [memberId]: progress },
        loadingProgress: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loadingProgress: false, error: message });
    }
  },

  async fetchExerciseHistory(memberId: string, exerciseId: string): Promise<void> {
    set({ loadingHistory: true, error: null });
    try {
      const history = await fetchExerciseHistory(memberId, exerciseId);
      const key = `${memberId}:${exerciseId}`;
      set((state) => ({
        historyByExercise: { ...state.historyByExercise, [key]: history },
        loadingHistory: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loadingHistory: false, error: message });
    }
  },
}));
