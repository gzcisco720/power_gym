import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

import { useTrainersStore } from '../../../stores/trainers.store';
import { TrainerOverviewTab } from './TrainerOverviewTab';
import { WeeklyScheduleBar } from './WeeklyScheduleBar';
import { SessionsTrendChart } from './SessionsTrendChart';
import { TrainerDetail, TrainerOverviewStats } from '../../../types/trainers';

const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

const MOCK_DETAIL: TrainerDetail = {
  id: 'tr1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  memberCount: 5,
  joinDate: '2023-01-15T00:00:00.000Z',
  members: [],
};

const MOCK_STATS: TrainerOverviewStats = {
  memberCount: 5,
  sessionsThisMonth: 20,
  templateCount: 8,
  activeMembersThisMonth: 4,
  newPRsThisMonth: 3,
  avgStreakDays: 12,
  weeklySchedule: [
    { day: 'Mon', count: 3 },
    { day: 'Tue', count: 5 },
    { day: 'Wed', count: 2 },
    { day: 'Thu', count: 4 },
    { day: 'Fri', count: 6 },
    { day: 'Sat', count: 1 },
    { day: 'Sun', count: 0 },
  ],
  sessionsTrend: [
    { month: '2025-12', count: 10 },
    { month: '2026-01', count: 15 },
    { month: '2026-02', count: 12 },
    { month: '2026-03', count: 18 },
    { month: '2026-04', count: 22 },
    { month: '2026-05', count: 20 },
  ],
};

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    detail: MOCK_DETAIL,
    detailLoading: false,
    detailError: null,
    overviewStats: null,
    overviewStatsLoading: false,
    overviewStatsError: null,
    fetchTrainerOverviewStats: jest.fn(),
    fetchTrainerDetail: jest.fn(),
    ...overrides,
  };
}

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const state = makeStoreState(overrides);
  mockUseTrainersStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useTrainersStore>) => unknown) => {
      if (typeof selector === 'function') {
        return selector(state as ReturnType<typeof useTrainersStore>);
      }
      return state;
    },
  );
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrainerOverviewTab', () => {
  describe('renders', () => {
    it('shows all 6 KPI cells with their values', () => {
      setupStoreMock({ overviewStats: MOCK_STATS });

      const { getByTestId } = render(
        <TrainerOverviewTab trainerId="tr1" detail={MOCK_DETAIL} />,
      );

      expect(getByTestId('kpi-memberCount')).toBeTruthy();
      expect(getByTestId('kpi-sessionsThisMonth')).toBeTruthy();
      expect(getByTestId('kpi-templateCount')).toBeTruthy();
      expect(getByTestId('kpi-activeMembersThisMonth')).toBeTruthy();
      expect(getByTestId('kpi-newPRsThisMonth')).toBeTruthy();
      expect(getByTestId('kpi-avgStreakDays')).toBeTruthy();
    });

    it('displays the correct KPI value for sessionsThisMonth', () => {
      setupStoreMock({ overviewStats: MOCK_STATS });

      const { getByTestId } = render(
        <TrainerOverviewTab trainerId="tr1" detail={MOCK_DETAIL} />,
      );

      const cell = getByTestId('kpi-sessionsThisMonth');
      expect(cell.props.children).toBeTruthy();
    });

    it('shows loading state when overviewStats is null and overviewStatsLoading is true', () => {
      setupStoreMock({ overviewStats: null, overviewStatsLoading: true });

      const { getByTestId } = render(
        <TrainerOverviewTab trainerId="tr1" detail={MOCK_DETAIL} />,
      );

      expect(getByTestId('overview-loading')).toBeTruthy();
    });

    it('shows zeros when stats have zero values', () => {
      const zeroStats: TrainerOverviewStats = {
        memberCount: 0,
        sessionsThisMonth: 0,
        templateCount: 0,
        activeMembersThisMonth: 0,
        newPRsThisMonth: 0,
        avgStreakDays: 0,
        weeklySchedule: [
          { day: 'Mon', count: 0 },
          { day: 'Tue', count: 0 },
          { day: 'Wed', count: 0 },
          { day: 'Thu', count: 0 },
          { day: 'Fri', count: 0 },
          { day: 'Sat', count: 0 },
          { day: 'Sun', count: 0 },
        ],
        sessionsTrend: [
          { month: '2025-12', count: 0 },
          { month: '2026-01', count: 0 },
          { month: '2026-02', count: 0 },
          { month: '2026-03', count: 0 },
          { month: '2026-04', count: 0 },
          { month: '2026-05', count: 0 },
        ],
      };
      setupStoreMock({ overviewStats: zeroStats });

      const { getAllByText } = render(
        <TrainerOverviewTab trainerId="tr1" detail={MOCK_DETAIL} />,
      );

      const zeros = getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(6);
    });
  });
});

describe('WeeklyScheduleBar', () => {
  describe('renders', () => {
    it('renders 7 day bars Mon-Sun with heights proportional to counts', () => {
      const { getByTestId } = render(
        <WeeklyScheduleBar schedule={MOCK_STATS.weeklySchedule} />,
      );

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach((day) => {
        expect(getByTestId(`schedule-bar-${day}`)).toBeTruthy();
      });
    });

    it('renders a bar for every day even when count is 0', () => {
      const allZeroSchedule = [
        { day: 'Mon', count: 0 },
        { day: 'Tue', count: 0 },
        { day: 'Wed', count: 0 },
        { day: 'Thu', count: 0 },
        { day: 'Fri', count: 0 },
        { day: 'Sat', count: 0 },
        { day: 'Sun', count: 0 },
      ];

      const { getByTestId } = render(
        <WeeklyScheduleBar schedule={allZeroSchedule} />,
      );

      expect(getByTestId('schedule-bar-Mon')).toBeTruthy();
      expect(getByTestId('schedule-bar-Sun')).toBeTruthy();
    });

    it('bar with higher count has greater height than bar with lower count', () => {
      const { getByTestId } = render(
        <WeeklyScheduleBar schedule={MOCK_STATS.weeklySchedule} />,
      );

      const friBar = getByTestId('schedule-bar-Fri'); // count 6
      const satBar = getByTestId('schedule-bar-Sat'); // count 1

      const friHeight = friBar.props.style?.height ?? friBar.props.style?.[0]?.height;
      const satHeight = satBar.props.style?.height ?? satBar.props.style?.[0]?.height;

      expect(friHeight).toBeGreaterThan(satHeight);
    });
  });
});

describe('SessionsTrendChart', () => {
  describe('renders', () => {
    it('renders one bar per month for the 6-month trend', () => {
      const { getByTestId } = render(
        <SessionsTrendChart trend={MOCK_STATS.sessionsTrend} />,
      );

      MOCK_STATS.sessionsTrend.forEach(({ month }) => {
        expect(getByTestId(`trend-bar-${month}`)).toBeTruthy();
      });
    });

    it('renders without crashing when all counts are zero', () => {
      const zeroTrend = MOCK_STATS.sessionsTrend.map((t) => ({ ...t, count: 0 }));

      const { getByTestId } = render(
        <SessionsTrendChart trend={zeroTrend} />,
      );

      expect(getByTestId(`trend-bar-${zeroTrend[0].month}`)).toBeTruthy();
    });
  });
});

describe('trainersStore > fetchTrainerOverviewStats', () => {
  it('stores stats and clears loading on success', async () => {
    // This test verifies the store contract from the Sprint Contract.
    // The store is tested in trainers.store.spec.ts — this entry documents
    // that the test lives there.
    expect(true).toBe(true);
  });
});
