import { create } from 'zustand';
import { fetchTrainers, fetchTrainerById } from '@/api/trainers';
import type { TrainerListItem, TrainerDetail } from '@/api/trainers';

interface TrainersState {
  trainers: TrainerListItem[];
  trainerDetail: TrainerDetail | null;
  isLoading: boolean;
  error: string | null;
  fetchTrainers: () => Promise<void>;
  fetchTrainerDetail: (id: string) => Promise<void>;
}

export const useTrainersStore = create<TrainersState>((set) => ({
  trainers: [],
  trainerDetail: null,
  isLoading: false,
  error: null,

  fetchTrainers: async () => {
    set({ isLoading: true, error: null });
    try {
      const trainers = await fetchTrainers();
      set({ trainers, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchTrainerDetail: async (id: string) => {
    set({ isLoading: true, error: null, trainerDetail: null });
    try {
      const trainerDetail = await fetchTrainerById(id);
      set({ trainerDetail, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
}));
