/**
 * Stage 3 unit tests — MemberTrainingTab (volume, accent bar, active session banner)
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockFetchMemberHistory = jest.fn();
const mockFetchMemberPersonalBests = jest.fn();
const mockFetchMemberActiveSession = jest.fn();
const mockFetchMemberExerciseHistory = jest.fn();

jest.mock('../../../lib/api/training.api', () => ({
  fetchMemberHistory: (...args: Parameters<typeof mockFetchMemberHistory>) =>
    mockFetchMemberHistory(...args),
  fetchMemberPersonalBests: (...args: Parameters<typeof mockFetchMemberPersonalBests>) =>
    mockFetchMemberPersonalBests(...args),
  fetchMemberActiveSession: (...args: Parameters<typeof mockFetchMemberActiveSession>) =>
    mockFetchMemberActiveSession(...args),
  fetchMemberExerciseHistory: (...args: Parameters<typeof mockFetchMemberExerciseHistory>) =>
    mockFetchMemberExerciseHistory(...args),
}));

jest.mock('../../../stores/training.store', () => ({
  useTrainingStore: (selector: (s: { fetchMemberPlan: jest.Mock; startMemberSession: jest.Mock }) => unknown) =>
    selector({ fetchMemberPlan: jest.fn().mockResolvedValue(null), startMemberSession: jest.fn() }),
}));

// Mock sub-components so tests focus on tab logic, not sub-component internals
jest.mock('./components/PersonalBestsGrid', () => ({
  PersonalBestsGrid: ({ personalBests }: { personalBests: { exerciseId: string }[] }) => {
    const { View } = require('react-native');
    return <View testID="personal-bests-grid" accessibilityLabel={String(personalBests.length)} />;
  },
}));

jest.mock('./components/StrengthProgressChart', () => ({
  StrengthProgressChart: () => {
    const { View } = require('react-native');
    return <View testID="strength-progress-chart" />;
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { WorkoutSession, SessionSet, ActivePlan } from '../../../types/training';
import { MemberTrainingTab } from './MemberTrainingTab';

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
    dayName: 'Push Day',
    startedAt: '2026-06-04T10:00:00.000Z',
    completedAt: '2026-06-04T11:00:00.000Z',
    sets: [makeSet()],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActivePlan> = {}): ActivePlan {
  return {
    _id: 'plan1',
    name: 'Strength Plan',
    templateId: 'tpl1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    days: [],
    ...overrides,
  };
}

const defaultProps = {
  memberId: 'mem1',
  memberName: 'Alice Smith',
  activePlan: null as ActivePlan | null,
  onAssignPress: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchMemberHistory.mockResolvedValue([]);
  mockFetchMemberPersonalBests.mockResolvedValue([]);
  mockFetchMemberActiveSession.mockResolvedValue(null);
  mockFetchMemberExerciseHistory.mockResolvedValue([]);
});

describe('MemberTrainingTab', () => {
  describe('volume', () => {
    it('computes total volume = sum(actualWeight × actualReps) over completed sets for a history row', async () => {
      // session with 2 completed sets: 80×10 + 60×8 = 1280
      const session = makeSession({
        _id: 'sess-vol',
        dayName: 'Push Day',
        sets: [
          makeSet({ actualWeight: 80, actualReps: 10, completedAt: '2026-06-04T11:00:00.000Z' }),
          makeSet({ setNumber: 2, actualWeight: 60, actualReps: 8, completedAt: '2026-06-04T11:05:00.000Z' }),
          // Incomplete set — must NOT be included in volume
          makeSet({ setNumber: 3, actualWeight: null, actualReps: null, completedAt: null }),
        ],
      });
      mockFetchMemberHistory.mockResolvedValue([session]);

      const { getByTestId } = render(<MemberTrainingTab {...defaultProps} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const row = getByTestId('history-session-sess-vol');
      // Volume text: 1280 kg
      expect(row.findByProps({ children: '1280 kg' })).toBeTruthy();
    });
  });

  describe('accent bar', () => {
    const cases: [string, string][] = [
      ['Push Day', 'indigo'],
      ['Pull Day', 'emerald'],
      ['Leg Day', 'amber'],
      ['Upper Body', 'pink'],
      ['Lower Body', 'rose'],
      ['Full Body Conditioning', 'muted'],
    ];

    it.each(cases)(
      'maps day name "%s" to accent color %s',
      async (dayName, expectedColor) => {
        const session = makeSession({ _id: `sess-${expectedColor}`, dayName });
        mockFetchMemberHistory.mockResolvedValue([session]);

        const { getByTestId } = render(<MemberTrainingTab {...defaultProps} />);

        await act(async () => {
          await new Promise((r) => setTimeout(r, 0));
        });

        const accentBar = getByTestId(`accent-bar-sess-${expectedColor}`);
        expect(JSON.stringify(accentBar.props.className)).toContain(expectedColor);
      },
    );
  });

  describe('active session banner', () => {
    it('renders Continue banner only when an in-progress session exists', async () => {
      mockFetchMemberActiveSession.mockResolvedValue({
        sessionId: 'sess-active',
        dayName: 'Push Day',
        startedAt: '2026-06-07T09:00:00.000Z',
      });

      const { getByTestId } = render(<MemberTrainingTab {...defaultProps} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(getByTestId('active-session-banner')).toBeTruthy();
    });

    it('does NOT render the Continue banner when there is no active session', async () => {
      mockFetchMemberActiveSession.mockResolvedValue(null);

      const { queryByTestId } = render(<MemberTrainingTab {...defaultProps} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(queryByTestId('active-session-banner')).toBeNull();
    });
  });
});
