import { create } from 'zustand';
import {
  fetchTrainers as apiFetchTrainers,
  fetchTrainerDetail as apiFetchTrainerDetail,
} from '../lib/api/trainers.api';
import { TrainerListItem, TrainerDetail } from '../types/trainers';

interface TrainersState {
  trainers: TrainerListItem[];
  loading: boolean;
  error: string | null;

  detail: TrainerDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  fetchTrainers(): Promise<void>;
  fetchTrainerDetail(id: string): Promise<void>;
}

export const useTrainersStore = create<TrainersState>((set) => ({
  trainers: [],
  loading: false,
  error: null,

  detail: null,
  detailLoading: false,
  detailError: null,

  async fetchTrainers(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const trainers = await apiFetchTrainers();
      set({ trainers, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async fetchTrainerDetail(id: string): Promise<void> {
    set({ detailLoading: true, detailError: null });
    try {
      const detail = await apiFetchTrainerDetail(id);
      set({ detail, detailLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ detailLoading: false, detailError: message });
    }
  },
}));
