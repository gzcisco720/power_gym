// Mock the API module before importing the store
jest.mock('../lib/api/trainer-dashboard.api', () => ({
  getTrainerDashboard: jest.fn(),
}));

import { getTrainerDashboard } from '../lib/api/trainer-dashboard.api';
import { useTrainerDashboardStore } from './trainer-dashboard.store';

const mockGetTrainerDashboard = getTrainerDashboard as jest.MockedFunction<typeof getTrainerDashboard>;

const MOCK_DATA = {
  stats: {
    memberCount: 10,
    sessionsTodayCount: 3,
    checkinsLast7Days: 8,
    needsAttentionCount: 2,
  },
  todaysSessions: [
    {
      memberId: 'm1',
      memberName: 'Alice Member',
      planName: 'Push Pull Legs',
      startTime: '2026-06-01T09:00:00.000Z',
      endTime: '2026-06-01T10:00:00.000Z',
      status: 'completed' as const,
    },
  ],
  needsAttention: [
    {
      memberId: 'm2',
      memberName: 'Bob Member',
      alertType: 'idle' as const,
      detail: '10 days no session',
    },
  ],
  pendingCheckins: [
    {
      memberId: 'm3',
      memberName: 'Carol Member',
      checkinId: 'ci1',
      createdAt: '2026-05-31T18:00:00.000Z',
    },
  ],
  compliance: [
    { memberId: 'm1', memberName: 'Alice Member', percentage: 85 },
    { memberId: 'm2', memberName: 'Bob Member', percentage: 40 },
  ],
  recentPRs: [
    {
      memberId: 'm1',
      memberName: 'Alice Member',
      exercise: 'Squat',
      estimatedOneRM: 120,
    },
  ],
  myTraining: {
    streakDays: 5,
    lastSessionType: 'Push',
    lastSessionDate: '2026-05-31T10:00:00.000Z',
    last14Days: Array(14).fill(false).map((_, i) => i % 3 === 0),
    sessionsThisMonth: 12,
  },
  thisWeek: [
    { day: 'Mon' as const, count: 2, isToday: false },
    { day: 'Tue' as const, count: 1, isToday: false },
    { day: 'Wed' as const, count: 3, isToday: false },
    { day: 'Thu' as const, count: 0, isToday: false },
    { day: 'Fri' as const, count: 1, isToday: false },
    { day: 'Sat' as const, count: 0, isToday: true },
    { day: 'Sun' as const, count: 0, isToday: false },
  ],
};

function resetStore() {
  useTrainerDashboardStore.setState({ data: null, isLoading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useTrainerDashboardStore', () => {
  describe('fetchDashboard', () => {
    it('populates data and clears isLoading on success', async () => {
      mockGetTrainerDashboard.mockResolvedValueOnce(MOCK_DATA);

      await useTrainerDashboardStore.getState().fetchDashboard();

      const state = useTrainerDashboardStore.getState();
      expect(state.data).toEqual(MOCK_DATA);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
