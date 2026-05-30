import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock the api module before importing the store
vi.mock('@/api/owner-dashboard', () => ({
  fetchStats: vi.fn(),
  fetchEquipmentStatus: vi.fn(),
  fetchTrainerBreakdown: vi.fn(),
  fetchMemberGrowth: vi.fn(),
}));

import { useOwnerDashboardStore } from './ownerDashboardStore';
import * as ownerDashboardApi from '@/api/owner-dashboard';

const mockStats = {
  trainerCount: 1,
  memberCount: 2,
  pendingInviteCount: 0,
  expiringSoonCount: 0,
  sessionsThisMonth: 5,
  sessionsLastMonth: 4,
  sessionsToday: 1,
  membersThisMonth: 1,
  checkInsThisWeek: 3,
  checkInsLastWeek: 6,
};

const mockEquipmentStatus = {
  active: 3,
  maintenance: 1,
  retired: 0,
  overdue: 0,
  items: [
    { _id: 'eq1', name: 'Track Machine', status: 'maintenance' as const, note: null, nextServiceDate: null },
  ],
};

const mockTrainerBreakdown = [
  { _id: 't1', name: 'Dev Trainer', email: 'trainer@dev.com', createdAt: new Date().toISOString(), memberCount: 2, sessionsThisMonth: 5 },
];

beforeEach(() => {
  // Reset the store state between tests
  useOwnerDashboardStore.setState({
    stats: null,
    equipmentStatus: null,
    trainerBreakdown: [],
    memberGrowth: [],
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('ownerDashboardStore', () => {
  describe('fetchStats', () => {
    it('populates stats and clears isLoading on success', async () => {
      vi.mocked(ownerDashboardApi.fetchStats).mockResolvedValueOnce(mockStats);

      await act(async () => {
        await useOwnerDashboardStore.getState().fetchStats();
      });

      const state = useOwnerDashboardStore.getState();
      expect(state.stats).toEqual(mockStats);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears isLoading on failure', async () => {
      vi.mocked(ownerDashboardApi.fetchStats).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useOwnerDashboardStore.getState().fetchStats();
      });

      const state = useOwnerDashboardStore.getState();
      expect(state.stats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchTrainerBreakdown', () => {
    it('populates rows array', async () => {
      vi.mocked(ownerDashboardApi.fetchTrainerBreakdown).mockResolvedValueOnce(mockTrainerBreakdown);

      await act(async () => {
        await useOwnerDashboardStore.getState().fetchTrainerBreakdown();
      });

      const state = useOwnerDashboardStore.getState();
      expect(state.trainerBreakdown).toEqual(mockTrainerBreakdown);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchEquipmentStatus', () => {
    it('populates equipmentStatus and clears isLoading on success', async () => {
      vi.mocked(ownerDashboardApi.fetchEquipmentStatus).mockResolvedValueOnce(mockEquipmentStatus);

      await act(async () => {
        await useOwnerDashboardStore.getState().fetchEquipmentStatus();
      });

      const state = useOwnerDashboardStore.getState();
      expect(state.equipmentStatus).toEqual(mockEquipmentStatus);
      expect(state.isLoading).toBe(false);
    });
  });
});
