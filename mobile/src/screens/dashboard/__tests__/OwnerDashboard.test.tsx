import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-native-gifted-charts — it uses native modules not available in Jest
jest.mock('react-native-gifted-charts', () => ({
  BarChart: () => null,
  LineChart: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/drawer', () => ({}));

jest.mock('../../../stores/owner-dashboard.store', () => ({
  useOwnerDashboardStore: jest.fn(),
}));

import { useOwnerDashboardStore } from '../../../stores/owner-dashboard.store';
import { OwnerDashboard } from '../OwnerDashboard';

const mockUseOwnerDashboardStore = useOwnerDashboardStore as jest.MockedFunction<
  typeof useOwnerDashboardStore
>;

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

describe('OwnerDashboard', () => {
  it('shows DashboardSkeleton while isLoading is true', () => {
    mockUseOwnerDashboardStore.mockReturnValue(
      makeStoreState({ isLoading: true }) as ReturnType<typeof useOwnerDashboardStore>,
    );
    const { getByTestId } = render(<OwnerDashboard />);
    expect(getByTestId('dashboard-skeleton')).toBeTruthy();
  });

  it('renders all six KPI StatCards with values from store data', () => {
    mockUseOwnerDashboardStore.mockReturnValue(
      makeStoreState({ data: MOCK_DATA }) as ReturnType<typeof useOwnerDashboardStore>,
    );
    const { getByTestId } = render(<OwnerDashboard />);
    expect(getByTestId('stat-trainers')).toBeTruthy();
    expect(getByTestId('stat-members')).toBeTruthy();
    expect(getByTestId('stat-sessions-month')).toBeTruthy();
    expect(getByTestId('stat-active-today')).toBeTruthy();
    expect(getByTestId('stat-checkin-rate')).toBeTruthy();
    expect(getByTestId('stat-pending-invites')).toBeTruthy();
  });

  it('renders "No trainers yet" empty state when trainerPerformance is empty', () => {
    mockUseOwnerDashboardStore.mockReturnValue(
      makeStoreState({
        data: { ...MOCK_DATA, trainerPerformance: [] },
      }) as ReturnType<typeof useOwnerDashboardStore>,
    );
    const { getByText } = render(<OwnerDashboard />);
    expect(getByText('No trainers yet')).toBeTruthy();
  });
});
