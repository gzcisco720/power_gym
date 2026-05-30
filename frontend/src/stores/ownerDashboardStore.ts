import { create } from 'zustand';
import {
  fetchStats,
  fetchEquipmentStatus,
  fetchTrainerBreakdown,
  fetchMemberGrowth,
} from '@/api/owner-dashboard';
import type {
  DashboardStats,
  EquipmentStatusResult,
  TrainerBreakdownRow,
  MemberGrowthBucket,
} from '@/api/owner-dashboard';

interface OwnerDashboardState {
  stats: DashboardStats | null;
  equipmentStatus: EquipmentStatusResult | null;
  trainerBreakdown: TrainerBreakdownRow[];
  memberGrowth: MemberGrowthBucket[];
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  fetchEquipmentStatus: () => Promise<void>;
  fetchTrainerBreakdown: () => Promise<void>;
  fetchMemberGrowth: () => Promise<void>;
}

export const useOwnerDashboardStore = create<OwnerDashboardState>((set) => ({
  stats: null,
  equipmentStatus: null,
  trainerBreakdown: [],
  memberGrowth: [],
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await fetchStats();
      set({ stats, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchEquipmentStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const equipmentStatus = await fetchEquipmentStatus();
      set({ equipmentStatus, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchTrainerBreakdown: async () => {
    set({ isLoading: true, error: null });
    try {
      const trainerBreakdown = await fetchTrainerBreakdown();
      set({ trainerBreakdown, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchMemberGrowth: async () => {
    set({ isLoading: true, error: null });
    try {
      const memberGrowth = await fetchMemberGrowth();
      set({ memberGrowth, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
}));
