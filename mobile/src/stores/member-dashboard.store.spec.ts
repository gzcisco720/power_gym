// Mock the API module before importing the store
jest.mock('../lib/api/member-dashboard.api', () => ({
  getMemberDashboard: jest.fn(),
}));

import { getMemberDashboard } from '../lib/api/member-dashboard.api';
import { useMemberDashboardStore } from './member-dashboard.store';

const mockGetMemberDashboard = getMemberDashboard as jest.MockedFunction<typeof getMemberDashboard>;

const MOCK_DATA = {
  greeting: { firstName: 'Alex', streakDays: 7 },
  todaysPlan: {
    planName: 'Push Pull Legs',
    dayType: 'Push',
    exercises: [{ name: 'Bench Press' }, { name: 'Overhead Press' }],
    exerciseCount: 6,
    setCount: 18,
    estimatedMinutes: 60,
    scheduledTime: null,
  },
  stats: {
    sessionsThisMonth: 14,
    latestWeight: 80.5,
    previousWeight: 81.2,
    latestBodyFat: 15.2,
    previousBodyFat: 16.0,
    topPR: { exercise: 'Squat', estimatedOneRM: 140 },
    newPRThisMonth: true,
  },
  trainingHeatmap: Array(90).fill(false).map((_, i) => i % 3 === 0),
  bodyComposition: [
    { date: '2026-04-01', weight: 82, bodyFat: 17 },
    { date: '2026-05-01', weight: 80.5, bodyFat: 15.2 },
  ],
  strengthProgress: {
    exercises: ['Squat', 'Bench Press', 'Deadlift'],
    data: [
      { date: '2026-04-01', estimatedOneRM: 130 },
      { date: '2026-05-01', estimatedOneRM: 140 },
    ],
  },
  nutritionToday: {
    dayType: 'Training Day',
    protein: 180,
    carbs: 250,
    fat: 60,
    calories: 2260,
  },
  upcomingSessions: [
    { datetime: '2026-06-02T09:00:00.000Z', type: 'individual' as const, groupSize: null, daysFromNow: 1 },
  ],
};

const STRENGTH_REFETCH_DATA = {
  exercises: ['Squat', 'Bench Press', 'Deadlift'],
  data: [
    { date: '2026-04-01', estimatedOneRM: 90 },
    { date: '2026-05-01', estimatedOneRM: 100 },
  ],
};

function resetStore() {
  useMemberDashboardStore.setState({
    data: null,
    isLoading: false,
    error: null,
    selectedExercise: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useMemberDashboardStore', () => {
  describe('fetchDashboard', () => {
    it('populates data and clears isLoading on success', async () => {
      mockGetMemberDashboard.mockResolvedValueOnce(MOCK_DATA);

      await useMemberDashboardStore.getState().fetchDashboard();

      const state = useMemberDashboardStore.getState();
      expect(state.data).toEqual(MOCK_DATA);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('selectExercise', () => {
    it('refetches strengthProgress for the chosen exercise and updates only that slice', async () => {
      // Prime the store with initial data
      useMemberDashboardStore.setState({ data: MOCK_DATA });

      // selectExercise calls getMemberDashboard?exercise=Bench Press
      mockGetMemberDashboard.mockResolvedValueOnce({
        ...MOCK_DATA,
        strengthProgress: STRENGTH_REFETCH_DATA,
      });

      await useMemberDashboardStore.getState().selectExercise('Bench Press');

      const state = useMemberDashboardStore.getState();
      // Only strengthProgress and selectedExercise updated
      expect(state.selectedExercise).toBe('Bench Press');
      expect(state.data?.strengthProgress).toEqual(STRENGTH_REFETCH_DATA);
      // Other data unchanged
      expect(state.data?.greeting).toEqual(MOCK_DATA.greeting);
      expect(mockGetMemberDashboard).toHaveBeenCalledWith('Bench Press');
    });
  });
});
