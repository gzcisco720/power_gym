import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: () => null,
  LineChart: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/drawer', () => ({}));

jest.mock('../../../stores/member-dashboard.store', () => ({
  useMemberDashboardStore: jest.fn(),
}));

// Mock Date to control time-of-day for greeting tests
const RealDate = global.Date;

import { useMemberDashboardStore } from '../../../stores/member-dashboard.store';
import { MemberDashboard } from '../MemberDashboard';
import { Skeleton } from '~/components/ui/skeleton';

const mockUseMemberDashboardStore = useMemberDashboardStore as jest.MockedFunction<
  typeof useMemberDashboardStore
>;

const BASE_DATA = {
  greeting: { firstName: 'Alex', streakDays: 7 },
  todaysPlan: {
    planName: 'Push Pull Legs',
    dayType: 'Push',
    exercises: [
      { name: 'Bench Press' },
      { name: 'Overhead Press' },
      { name: 'Tricep Dip' },
    ],
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
    {
      datetime: '2026-06-02T09:00:00.000Z',
      type: 'individual' as const,
      groupSize: null,
      daysFromNow: 1,
    },
  ],
};

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    data: null,
    isLoading: false,
    error: null,
    selectedExercise: null,
    fetchDashboard: jest.fn(),
    selectExercise: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.Date = RealDate;
});

describe('MemberDashboard', () => {
  it('shows Skeleton while loading — renders Reusables Skeleton, not ActivityIndicator or "Loading…" text', () => {
    mockUseMemberDashboardStore.mockReturnValue(
      makeStoreState({ isLoading: true }) as ReturnType<typeof useMemberDashboardStore>,
    );
    const { UNSAFE_getAllByType, queryByText } = render(<MemberDashboard />);

    // Must render at least one Reusables Skeleton
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons.length).toBeGreaterThan(0);

    // Must NOT show "Loading…" text
    expect(queryByText(/loading/i)).toBeNull();
  });

  it('renders the workout hero card when todaysPlan is not null', () => {
    mockUseMemberDashboardStore.mockReturnValue(
      makeStoreState({ data: BASE_DATA }) as ReturnType<typeof useMemberDashboardStore>,
    );
    const { getByTestId } = render(<MemberDashboard />);
    expect(getByTestId('workout-hero-card')).toBeTruthy();
  });

  it('renders "No training plan assigned yet" when todaysPlan is null', () => {
    mockUseMemberDashboardStore.mockReturnValue(
      makeStoreState({
        data: { ...BASE_DATA, todaysPlan: null },
      }) as ReturnType<typeof useMemberDashboardStore>,
    );
    const { getByText } = render(<MemberDashboard />);
    expect(getByText('No training plan assigned yet')).toBeTruthy();
  });

  it('renders "No nutrition plan assigned" when nutritionToday is null', () => {
    mockUseMemberDashboardStore.mockReturnValue(
      makeStoreState({
        data: { ...BASE_DATA, nutritionToday: null },
      }) as ReturnType<typeof useMemberDashboardStore>,
    );
    const { getByText } = render(<MemberDashboard />);
    expect(getByText('No nutrition plan assigned')).toBeTruthy();
  });

  it('greeting shows the correct time-of-day emoji for a given hour', () => {
    // Mock Date to return 9 AM (morning → ☀️)
    const mockDate = new Date('2026-06-01T09:00:00');
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) return mockDate;
      return new RealDate(...(args as ConstructorParameters<typeof Date>));
    });
    (global.Date as unknown as { now: () => number }).now = RealDate.now;

    mockUseMemberDashboardStore.mockReturnValue(
      makeStoreState({ data: BASE_DATA }) as ReturnType<typeof useMemberDashboardStore>,
    );
    const { getByText } = render(<MemberDashboard />);
    expect(getByText(/Good morning.*☀️/)).toBeTruthy();
  });
});
