import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: jest.fn(),
}));

jest.mock('../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

import { useRoute } from '@react-navigation/native';
import { useTrainersStore } from '../../stores/trainers.store';
import { TrainerDetail } from '../../types/trainers';
import { TrainerDetailScreen } from './TrainerDetailScreen';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function makeDetail(overrides: Partial<TrainerDetail> = {}): TrainerDetail {
  return {
    id: 'trainer1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    memberCount: 2,
    joinDate: '2023-06-15T00:00:00.000Z',
    members: [
      { id: 'member1', name: 'John Doe', email: 'john@example.com' },
      { id: 'member2', name: 'Jane Doe', email: 'jane@example.com' },
    ],
    ...overrides,
  };
}

const MOCK_OVERVIEW_STATS = {
  memberCount: 2,
  sessionsThisMonth: 10,
  templateCount: 3,
  activeMembersThisMonth: 2,
  newPRsThisMonth: 1,
  avgStreakDays: 8,
  weeklySchedule: [
    { day: 'Mon', count: 1 },
    { day: 'Tue', count: 2 },
    { day: 'Wed', count: 0 },
    { day: 'Thu', count: 1 },
    { day: 'Fri', count: 3 },
    { day: 'Sat', count: 0 },
    { day: 'Sun', count: 0 },
  ],
  sessionsTrend: [
    { month: '2025-12', count: 5 },
    { month: '2026-01', count: 8 },
    { month: '2026-02', count: 7 },
    { month: '2026-03', count: 10 },
    { month: '2026-04', count: 12 },
    { month: '2026-05', count: 10 },
  ],
};

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    trainers: [],
    loading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    trainerMembers: [],
    trainerMembersLoading: false,
    trainerMembersError: null,
    trainerSessions: [],
    trainerSessionsLoading: false,
    trainerSessionsError: null,
    trainerTrainingPlans: [],
    trainerTrainingPlansLoading: false,
    trainerTrainingPlansError: null,
    trainerNutritionPlans: [],
    trainerNutritionPlansLoading: false,
    trainerNutritionPlansError: null,
    overviewStats: null,
    overviewStatsLoading: false,
    overviewStatsError: null,
    fetchTrainers: jest.fn(),
    fetchTrainerDetail: jest.fn(),
    fetchTrainerMembers: jest.fn(),
    fetchTrainerSessions: jest.fn(),
    fetchTrainerTrainingPlans: jest.fn(),
    fetchTrainerNutritionPlans: jest.fn(),
    fetchTrainerOverviewStats: jest.fn(),
    reassignMember: jest.fn(),
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

function setupRoute(trainerId: string, trainerName: string) {
  mockUseRoute.mockReturnValue({
    key: 'TrainerDetail',
    name: 'TrainerDetail',
    params: { trainerId, trainerName },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoBack.mockReset();
});

describe('TrainerDetailScreen', () => {
  it('calls fetchTrainerDetail with route trainerId on mount', () => {
    const fetchTrainerDetail = jest.fn().mockResolvedValue(undefined);
    setupRoute('trainer1', 'Alice Smith');
    setupStoreMock({ fetchTrainerDetail });

    render(<TrainerDetailScreen />);

    expect(fetchTrainerDetail).toHaveBeenCalledWith('trainer1');
  });

  it('Overview tab shows memberCount KPI when stats are loaded', () => {
    setupRoute('trainer1', 'Alice Smith');
    const detail = makeDetail({ memberCount: 2 });
    setupStoreMock({ detail, overviewStats: MOCK_OVERVIEW_STATS });

    const { getByTestId } = render(<TrainerDetailScreen />);

    expect(getByTestId('kpi-memberCount')).toBeTruthy();
    expect(getByTestId('kpi-sessionsThisMonth')).toBeTruthy();
  });

  it('tapping Members tab renders store-based member rows', () => {
    setupRoute('trainer1', 'Alice Smith');
    const detail = makeDetail();
    setupStoreMock({
      detail,
      trainerMembers: [
        { id: 'm1', name: 'John Doe', email: 'john@example.com', streak: 3, sessionsThisMonth: 8, status: 'active' },
      ],
    });

    const { getByTestId, getByText } = render(<TrainerDetailScreen />);

    // Tap Members tab
    fireEvent.press(getByTestId('trainer-detail-tab-members'));

    // Store-based member row should appear
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByTestId('trainer-member-row-m1')).toBeTruthy();
  });

  it('renders trainer name in header', () => {
    setupRoute('trainer1', 'Alice Smith');
    setupStoreMock();

    const { getByText } = render(<TrainerDetailScreen />);

    expect(getByText('Alice Smith')).toBeTruthy();
  });

  it('shows 5 tab buttons: Overview, Members, Calendar, Training, Nutrition', () => {
    setupRoute('trainer1', 'Alice Smith');
    setupStoreMock();

    const { getByTestId } = render(<TrainerDetailScreen />);

    expect(getByTestId('trainer-detail-tab-overview')).toBeTruthy();
    expect(getByTestId('trainer-detail-tab-members')).toBeTruthy();
    expect(getByTestId('trainer-detail-tab-calendar')).toBeTruthy();
    expect(getByTestId('trainer-detail-tab-training')).toBeTruthy();
    expect(getByTestId('trainer-detail-tab-nutrition')).toBeTruthy();
  });

  describe('Tabs', () => {
    it('switches between Overview/Training/Nutrition tabs', () => {
      setupRoute('trainer1', 'Alice Smith');
      const detail = makeDetail();
      setupStoreMock({
        detail,
        overviewStats: MOCK_OVERVIEW_STATS,
        trainerTrainingPlans: [{ id: 'tp1', name: 'Strength Plan', dayCount: 4, createdAt: '2026-01-01T00:00:00.000Z' }],
        trainerNutritionPlans: [{ id: 'np1', name: 'Cut Plan', dayCount: 7, createdAt: '2026-01-01T00:00:00.000Z' }],
      });

      const { getByTestId, getByText } = render(<TrainerDetailScreen />);

      // Default tab is Overview — KPI cells present
      expect(getByTestId('kpi-memberCount')).toBeTruthy();

      // Switch to Training tab
      fireEvent.press(getByTestId('trainer-detail-tab-training'));
      expect(getByText('Strength Plan')).toBeTruthy();

      // Switch to Nutrition tab
      fireEvent.press(getByTestId('trainer-detail-tab-nutrition'));
      expect(getByText('Cut Plan')).toBeTruthy();
    });
  });
});
