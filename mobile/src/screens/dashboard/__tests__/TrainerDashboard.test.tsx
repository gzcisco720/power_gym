import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/drawer', () => ({}));

jest.mock('../../../stores/trainer-dashboard.store', () => ({
  useTrainerDashboardStore: jest.fn(),
}));

import { useTrainerDashboardStore } from '../../../stores/trainer-dashboard.store';
import { TrainerDashboard } from '../TrainerDashboard';

const mockUseTrainerDashboardStore = useTrainerDashboardStore as jest.MockedFunction<
  typeof useTrainerDashboardStore
>;

const BASE_DATA = {
  stats: {
    memberCount: 10,
    sessionsTodayCount: 2,
    checkinsLast7Days: 8,
    needsAttentionCount: 1,
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

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    data: null,
    isLoading: false,
    error: null,
    fetchDashboard: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrainerDashboard', () => {
  it('shows DashboardSkeleton while loading', () => {
    mockUseTrainerDashboardStore.mockReturnValue(
      makeStoreState({ isLoading: true }) as ReturnType<typeof useTrainerDashboardStore>,
    );
    const { getByTestId } = render(<TrainerDashboard />);
    expect(getByTestId('dashboard-skeleton')).toBeTruthy();
  });

  it('renders "No sessions scheduled today" when todaysSessions is empty', () => {
    mockUseTrainerDashboardStore.mockReturnValue(
      makeStoreState({ data: { ...BASE_DATA, todaysSessions: [] } }) as ReturnType<
        typeof useTrainerDashboardStore
      >,
    );
    const { getByText } = render(<TrainerDashboard />);
    expect(getByText('No sessions scheduled today')).toBeTruthy();
  });

  it('renders "All caught up ✓" when pendingCheckins is empty', () => {
    mockUseTrainerDashboardStore.mockReturnValue(
      makeStoreState({ data: { ...BASE_DATA, pendingCheckins: [] } }) as ReturnType<
        typeof useTrainerDashboardStore
      >,
    );
    const { getByText } = render(<TrainerDashboard />);
    expect(getByText('All caught up ✓')).toBeTruthy();
  });

  it('renders 14-cell TrainingHeatmap from myTraining.last14Days', () => {
    mockUseTrainerDashboardStore.mockReturnValue(
      makeStoreState({ data: BASE_DATA }) as ReturnType<typeof useTrainerDashboardStore>,
    );
    const { getAllByTestId } = render(<TrainerDashboard />);
    // TrainingHeatmap renders cells with testID="heatmap-cell"
    const cells = getAllByTestId('heatmap-cell');
    expect(cells).toHaveLength(14);
  });
});
