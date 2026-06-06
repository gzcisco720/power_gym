import { create } from 'zustand';
import {
  fetchTrainers as apiFetchTrainers,
  fetchTrainerDetail as apiFetchTrainerDetail,
  fetchTrainerMembers as apiFetchTrainerMembers,
  fetchTrainerSessions as apiFetchTrainerSessions,
  fetchTrainerTrainingPlans as apiFetchTrainerTrainingPlans,
  fetchTrainerNutritionPlans as apiFetchTrainerNutritionPlans,
  reassignMember as apiReassignMember,
} from '../lib/api/trainers.api';
import {
  TrainerListItem,
  TrainerDetail,
  TrainerMemberMetrics,
  TrainerSessionItem,
  TrainerTemplateItem,
} from '../types/trainers';

interface TrainersState {
  trainers: TrainerListItem[];
  loading: boolean;
  error: string | null;

  detail: TrainerDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  trainerMembers: TrainerMemberMetrics[];
  trainerMembersLoading: boolean;
  trainerMembersError: string | null;

  trainerSessions: TrainerSessionItem[];
  trainerSessionsLoading: boolean;
  trainerSessionsError: string | null;

  trainerTrainingPlans: TrainerTemplateItem[];
  trainerTrainingPlansLoading: boolean;
  trainerTrainingPlansError: string | null;

  trainerNutritionPlans: TrainerTemplateItem[];
  trainerNutritionPlansLoading: boolean;
  trainerNutritionPlansError: string | null;

  fetchTrainers(): Promise<void>;
  fetchTrainerDetail(id: string): Promise<void>;
  fetchTrainerMembers(id: string): Promise<void>;
  fetchTrainerSessions(id: string): Promise<void>;
  fetchTrainerTrainingPlans(id: string): Promise<void>;
  fetchTrainerNutritionPlans(id: string): Promise<void>;
  reassignMember(currentTrainerId: string, memberId: string, targetTrainerId: string): Promise<void>;
}

export const useTrainersStore = create<TrainersState>((set, get) => ({
  trainers: [],
  loading: false,
  error: null,

  detail: null,
  detailLoading: false,
  detailError: null,

  trainerMembers: [],
  trainerMembersLoading: false,
  trainerMembersError: null,

  trainerSessions: [],
  trainerSessionsLoading: false,
  trainerSessionsError: null,

  trainerTrainingPlans: [],
  trainerTrainingPlansLoading: false,
  trainerTrainingPlansError: null,

  trainerNutritionPlans: [],
  trainerNutritionPlansLoading: false,
  trainerNutritionPlansError: null,

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

  async fetchTrainerMembers(id: string): Promise<void> {
    set({ trainerMembersLoading: true, trainerMembersError: null });
    try {
      const trainerMembers = await apiFetchTrainerMembers(id);
      set({ trainerMembers, trainerMembersLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ trainerMembersLoading: false, trainerMembersError: message });
    }
  },

  async fetchTrainerSessions(id: string): Promise<void> {
    set({ trainerSessionsLoading: true, trainerSessionsError: null });
    try {
      const trainerSessions = await apiFetchTrainerSessions(id);
      set({ trainerSessions, trainerSessionsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ trainerSessionsLoading: false, trainerSessionsError: message });
    }
  },

  async fetchTrainerTrainingPlans(id: string): Promise<void> {
    set({ trainerTrainingPlansLoading: true, trainerTrainingPlansError: null });
    try {
      const trainerTrainingPlans = await apiFetchTrainerTrainingPlans(id);
      set({ trainerTrainingPlans, trainerTrainingPlansLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ trainerTrainingPlansLoading: false, trainerTrainingPlansError: message });
    }
  },

  async fetchTrainerNutritionPlans(id: string): Promise<void> {
    set({ trainerNutritionPlansLoading: true, trainerNutritionPlansError: null });
    try {
      const trainerNutritionPlans = await apiFetchTrainerNutritionPlans(id);
      set({ trainerNutritionPlans, trainerNutritionPlansLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ trainerNutritionPlansLoading: false, trainerNutritionPlansError: message });
    }
  },

  async reassignMember(currentTrainerId: string, memberId: string, targetTrainerId: string): Promise<void> {
    await apiReassignMember(currentTrainerId, memberId, targetTrainerId);
    await get().fetchTrainerMembers(currentTrainerId);
  },
}));
