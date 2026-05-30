import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/member-portal', () => ({
  fetchDashboard: vi.fn(),
}));

import { fetchDashboard } from '@/api/member-portal';
import { useMemberDashboardStore } from './memberDashboardStore';

const mockFetchDashboard = fetchDashboard as ReturnType<typeof vi.fn>;

const seedDashboard = {
  kpis: {
    sessionsThisMonth: 5,
    activeStreak: 3,
    weightKg: '80.0',
    weightDelta: -1.5,
    weightImproved: true,
    bfPct: '18.5',
    bfDelta: -0.5,
    bfImproved: true,
    topPrName: 'Bench Press',
    topPrKg: '100.0',
    isNewPr: false,
  },
  upcomingSessions: [
    { _id: 'ses1', date: '2026-06-01', startTime: '09:00', endTime: '10:00', memberCount: 1 },
  ],
  nutritionToday: { protein: 150, carbs: 200, fat: 60, kcal: 1940, dayTypeName: 'Training Day' },
  activePlan: { name: 'Push-Pull-Legs', dayCount: 3 },
};

describe('memberDashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemberDashboardStore.setState({
      dashboard: null,
      isLoading: false,
      error: null,
    });
  });

  describe('fetch', () => {
    it('sets isLoading true then false', async () => {
      let resolvePromise!: (v: typeof seedDashboard) => void;
      mockFetchDashboard.mockReturnValueOnce(
        new Promise<typeof seedDashboard>((res) => { resolvePromise = res; }),
      );

      const fetchPromise = useMemberDashboardStore.getState().fetch();
      expect(useMemberDashboardStore.getState().isLoading).toBe(true);

      resolvePromise(seedDashboard);
      await fetchPromise;
      expect(useMemberDashboardStore.getState().isLoading).toBe(false);
    });

    it('populates hero + kpis + upcoming + nutritionToday', async () => {
      mockFetchDashboard.mockResolvedValueOnce(seedDashboard);

      await useMemberDashboardStore.getState().fetch();

      const { dashboard, isLoading } = useMemberDashboardStore.getState();
      expect(isLoading).toBe(false);
      expect(dashboard).not.toBeNull();
      expect(dashboard!.kpis.sessionsThisMonth).toBe(5);
      expect(dashboard!.kpis.topPrName).toBe('Bench Press');
      expect(dashboard!.upcomingSessions).toHaveLength(1);
      expect(dashboard!.nutritionToday?.protein).toBe(150);
      expect(dashboard!.activePlan?.name).toBe('Push-Pull-Legs');
    });

    it('sets error and clears isLoading on failure', async () => {
      mockFetchDashboard.mockRejectedValueOnce(new Error('Network error'));

      await useMemberDashboardStore.getState().fetch();

      const { isLoading, error } = useMemberDashboardStore.getState();
      expect(isLoading).toBe(false);
      expect(error).toBe('Network error');
    });
  });
});
