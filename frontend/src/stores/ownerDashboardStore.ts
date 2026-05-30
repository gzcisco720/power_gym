import { create } from 'zustand';
import { fetchStats, fetchEquipmentStatus } from '@/api/owner-dashboard';
import type { DashboardStats, EquipmentStatusResult } from '@/api/owner-dashboard';

interface OwnerDashboardState {
  stats: DashboardStats | null;
  equipmentStatus: EquipmentStatusResult | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  fetchEquipmentStatus: () => Promise<void>;
}

export const useOwnerDashboardStore = create<OwnerDashboardState>((set) => ({
  stats: null,
  equipmentStatus: null,
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
}));
