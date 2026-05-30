import { create } from 'zustand';
import {
  fetchTrainers,
  fetchTrainerById,
  fetchTrainerMembers,
  fetchTrainerPlans,
  fetchTrainerNutritionPlans,
} from '@/api/trainers';
import type {
  TrainerListItem,
  TrainerDetail,
  TrainerMemberItem,
  TrainerPlanItem,
  TrainerNutritionPlanItem,
} from '@/api/trainers';

interface TrainersState {
  trainers: TrainerListItem[];
  trainerDetail: TrainerDetail | null;
  trainerMembers: TrainerMemberItem[];
  trainerPlans: TrainerPlanItem[];
  trainerNutritionPlans: TrainerNutritionPlanItem[];
  isLoading: boolean;
  error: string | null;
  fetchTrainers: () => Promise<void>;
  fetchTrainerDetail: (id: string) => Promise<void>;
}

export const useTrainersStore = create<TrainersState>((set) => ({
  trainers: [],
  trainerDetail: null,
  trainerMembers: [],
  trainerPlans: [],
  trainerNutritionPlans: [],
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
    set({ isLoading: true, error: null, trainerDetail: null, trainerMembers: [], trainerPlans: [], trainerNutritionPlans: [] });
    try {
      const [trainerDetail, trainerMembers, trainerPlans, trainerNutritionPlans] = await Promise.all([
        fetchTrainerById(id),
        fetchTrainerMembers(id),
        fetchTrainerPlans(id),
        fetchTrainerNutritionPlans(id),
      ]);
      set({ trainerDetail, trainerMembers, trainerPlans, trainerNutritionPlans, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
}));
