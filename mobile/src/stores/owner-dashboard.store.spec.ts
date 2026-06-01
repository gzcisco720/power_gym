// Mock the API module before importing the store
jest.mock('../lib/api/owner-dashboard.api', () => ({
  getOwnerDashboard: jest.fn(),
}));

import { getOwnerDashboard } from '../lib/api/owner-dashboard.api';
import { useOwnerDashboardStore } from './owner-dashboard.store';

const mockGetOwnerDashboard = getOwnerDashboard as jest.MockedFunction<typeof getOwnerDashboard>;

const MOCK_DATA = {
  stats: {
    trainerCount: 3,
    memberCount: 25,
    membersJoinedThisMonth: 5,
    sessionsThisMonth: 120,
    sessionsLastMonth: 100,
    activeToday: 8,
    checkinRateThisWeek: 75,
    checkinRateLastWeek: 70,
    pendingInviteCount: 4,
    expiringInviteCount: 2,
  },
  memberGrowth: [
    { month: 'Jan', count: 4 },
    { month: 'Feb', count: 6 },
    { month: 'Mar', count: 3 },
    { month: 'Apr', count: 7 },
    { month: 'May', count: 5 },
    { month: 'Jun', count: 5 },
  ],
  trainerPerformance: [
    { trainerId: 't1', name: 'Alice', sessionCount: 20, memberCount: 10 },
    { trainerId: 't2', name: 'Bob', sessionCount: 15, memberCount: 8 },
  ],
  equipment: {
    activeCount: 30,
    maintenanceCount: 3,
    retiredCount: 1,
    overdueCount: 2,
    nonActiveItems: [
      { name: 'Barbell 1', status: 'maintenance' as const, notes: null },
      { name: 'Treadmill A', status: 'overdue' as const, notes: 'Needs service' },
    ],
  },
};

function resetStore() {
  useOwnerDashboardStore.setState({ data: null, isLoading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useOwnerDashboardStore', () => {
  describe('fetchDashboard', () => {
    it('populates data and sets isLoading false on success', async () => {
      mockGetOwnerDashboard.mockResolvedValueOnce(MOCK_DATA);

      await useOwnerDashboardStore.getState().fetchDashboard();

      const state = useOwnerDashboardStore.getState();
      expect(state.data).toEqual(MOCK_DATA);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('leaves data null and surfaces error on request failure', async () => {
      mockGetOwnerDashboard.mockRejectedValueOnce(new Error('Network error'));

      await useOwnerDashboardStore.getState().fetchDashboard();

      const state = useOwnerDashboardStore.getState();
      expect(state.data).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });
});
