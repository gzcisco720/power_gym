/**
 * Stage 8 unit tests — Members tabs Reusables migration
 *
 * 1. MemberDetailScreen > Tabs > switches between member tabs
 * 2. MemberProgressTab > renders Progress bar from props
 * 3. MemberTrainingTab > row press > navigates to session/plan
 * 4. MemberOverviewTab > loading > renders Skeleton
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Shared mocks ───────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ── MemberDetailScreen mocks ───────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: jest.fn(),
}));

jest.mock('../../../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../../../stores/member-photos.store', () => ({
  useMemberPhotosStore: jest.fn((selector) => {
    const state = {
      photosByMember: { mem1: [] },
      loadingByMember: { mem1: false },
      errorByMember: { mem1: null },
      fetchPhotos: jest.fn().mockResolvedValue(undefined),
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

// ── MemberProgressTab mocks ───────────────────────────────────────────────────

jest.mock('../../../../stores/member-progress.store', () => ({
  useMemberProgressStore: jest.fn((selector) => {
    const state = {
      progressByMember: {},
      historyByExercise: {},
      loadingProgress: false,
      loadingHistory: false,
      error: null,
      fetchProgress: jest.fn().mockResolvedValue(undefined),
      fetchExerciseHistory: jest.fn().mockResolvedValue(undefined),
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

// ── MemberTrainingTab mocks ───────────────────────────────────────────────────

jest.mock('../../../../lib/api/training.api', () => ({
  fetchMemberHistory: jest.fn().mockResolvedValue([]),
  fetchMemberPersonalBests: jest.fn().mockResolvedValue([]),
  fetchMemberActiveSession: jest.fn().mockResolvedValue(null),
  fetchMemberExerciseHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock('../components/PersonalBestsGrid', () => ({
  PersonalBestsGrid: () => null,
}));

jest.mock('../components/StrengthProgressChart', () => ({
  StrengthProgressChart: () => null,
}));

jest.mock('../../../../stores/training.store', () => ({
  useTrainingStore: (selector: (s: { fetchMemberPlan: jest.Mock; startMemberSession: jest.Mock }) => unknown) =>
    selector({ fetchMemberPlan: jest.fn().mockResolvedValue(null), startMemberSession: jest.fn() }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useMembersStore } from '../../../../stores/members.store';
import { MemberDetailScreen } from '../../MemberDetailScreen';
import { MemberProgressTab } from '../MemberProgressTab';
import { MemberTrainingTab } from '../MemberTrainingTab';
import { MemberOverviewTab } from '../MemberOverviewTab';
import { Member, MemberOverview } from '../../../../types/members';
import { WorkoutSession, SessionSet } from '../../../../types/training';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseStore = useMembersStore as jest.MockedFunction<typeof useMembersStore>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    trainerId: 'trainer1',
    trainerName: 'Bob Trainer',
    ...overrides,
  };
}

function makeOverview(overrides: Partial<MemberOverview> = {}): MemberOverview {
  return {
    joinedAt: '2024-01-15T00:00:00.000Z',
    lastBodyTestDate: null,
    lastCheckinDate: null,
    ...overrides,
  };
}

function makeDetailSlice() {
  return {
    overview: makeOverview(),
    overviewStats: null,
    bodyTests: [],
    injuries: [],
    medications: [],
    checkIns: [],
  };
}

function setupStore(member: Member, detail: ReturnType<typeof makeDetailSlice>, loading = false) {
  const state = {
    members: [member],
    loading: false,
    error: null,
    searchQuery: '',
    detailLoading: loading,
    detailError: null,
    selectedMembers: { mem1: detail },
    fetchMembers: jest.fn(),
    filteredMembers: jest.fn(() => [member]),
    setSearchQuery: jest.fn(),
    fetchMemberDetail: jest.fn(),
  };

  mockUseStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupRoute(memberId: string) {
  mockUseRoute.mockReturnValue({
    key: 'MemberDetail',
    name: 'MemberDetail',
    params: { memberId },
  });
}

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    exerciseId: 'ex1',
    exerciseName: 'Bench Press',
    groupId: 'g1',
    isSuperset: false,
    isBodyweight: false,
    setNumber: 1,
    prescribedRepsMin: 8,
    prescribedRepsMax: 12,
    isExtraSet: false,
    actualWeight: 80,
    actualReps: 10,
    completedAt: '2026-06-04T11:00:00.000Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'sess1',
    memberId: 'mem1',
    memberPlanId: 'plan1',
    dayNumber: 1,
    dayName: 'Day 1 - Push',
    startedAt: '2026-06-04T10:00:00.000Z',
    completedAt: '2026-06-04T11:00:00.000Z',
    sets: [makeSet()],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Test 1: MemberDetailScreen > Tabs > switches between member tabs ──────────

describe('MemberDetailScreen', () => {
  describe('Tabs', () => {
    it('switches between member tabs — pressing a tab renders that tab content', () => {
      setupRoute('mem1');
      setupStore(makeMember(), makeDetailSlice());

      const { getByTestId, getByText, queryByTestId } = render(<MemberDetailScreen />);

      // Initially overview tab is active — kpi-sessions is a unique overview element
      expect(getByTestId('member-detail-tab-overview')).toBeTruthy();
      expect(getByTestId('kpi-sessions')).toBeTruthy();

      // Press the body tests tab
      fireEvent.press(getByTestId('member-detail-tab-bodytests'));

      // Body tests tab content visible ("No body tests recorded yet." empty state)
      expect(getByText('No body tests recorded yet.')).toBeTruthy();

      // Overview content (kpi-sessions) should no longer be rendered
      expect(queryByTestId('kpi-sessions')).toBeNull();
    });
  });
});

// ── Test 2: MemberProgressTab > renders Progress bar from props ───────────────

describe('MemberProgressTab', () => {
  it('renders Progress bar from props', () => {
    // Override the mock for this test to return a member with progress data
    const { useMemberProgressStore } = require('../../../../stores/member-progress.store');
    (useMemberProgressStore as jest.MockedFunction<typeof useMemberProgressStore>).mockImplementation(
      (selector) => {
        const state = {
          progressByMember: {
            mem1: {
              heatmapDates: ['2026-06-01'],
              exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', completionRate: 75 }],
            },
          },
          historyByExercise: {},
          loadingProgress: false,
          loadingHistory: false,
          error: null,
          fetchProgress: jest.fn().mockResolvedValue(undefined),
          fetchExerciseHistory: jest.fn().mockResolvedValue(undefined),
        };
        if (typeof selector === 'function') return selector(state);
        return state;
      },
    );

    const { getByTestId } = render(<MemberProgressTab memberId="mem1" />);

    // Progress bar for the exercise should be rendered
    expect(getByTestId('progress-bar-ex1')).toBeTruthy();
  });
});

// ── Test 3: MemberTrainingTab > row press > navigates to session/plan ─────────

describe('MemberTrainingTab', () => {
  it('row press > navigates to session/plan', async () => {
    const { fetchMemberHistory } = require('../../../../lib/api/training.api');
    (fetchMemberHistory as jest.Mock).mockResolvedValue([
      makeSession({ _id: 'sess1' }),
    ]);

    render(
      <MemberTrainingTab
        memberId="mem1"
        memberName="Alice Smith"
        activePlan={null}
        onAssignPress={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // The history session row press should navigate to SessionDetail
    const { getByTestId } = render(
      <MemberTrainingTab
        memberId="mem1"
        memberName="Alice Smith"
        activePlan={null}
        onAssignPress={jest.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    fireEvent.press(getByTestId('history-session-sess1'));
    expect(mockNavigate).toHaveBeenCalledWith('SelfSessionDetail', { sessionId: 'sess1' });
  });
});

// ── Test 4: MemberOverviewTab > loading > renders Skeleton ───────────────────

describe('MemberOverviewTab', () => {
  it('loading > renders Skeleton', () => {
    const { getByTestId } = render(
      <MemberOverviewTab overviewStats={null} onNavigateToTab={jest.fn()} loading />,
    );

    expect(getByTestId('overview-skeleton')).toBeTruthy();
  });
});
