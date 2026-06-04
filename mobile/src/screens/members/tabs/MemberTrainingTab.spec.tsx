/**
 * Stage 3 unit tests — MemberTrainingTab
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockFetchMemberHistory = jest.fn();
const mockAssignPlanApi = jest.fn();

jest.mock('../../../lib/api/training.api', () => ({
  fetchMemberHistory: (...args: Parameters<typeof mockFetchMemberHistory>) =>
    mockFetchMemberHistory(...args),
  assignPlan: (...args: Parameters<typeof mockAssignPlanApi>) => mockAssignPlanApi(...args),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { WorkoutSession, ActivePlan, SessionSet } from '../../../types/training';
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
    dayName: 'Day 1 - Push',
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

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MemberTrainingTab', () => {
  it('shows the active plan name and a history-session-{id} row per completed session', async () => {
    const plan = makePlan();
    const sessions = [
      makeSession({ _id: 'sess1' }),
      makeSession({ _id: 'sess2', dayName: 'Day 2 - Pull' }),
    ];
    mockFetchMemberHistory.mockResolvedValue(sessions);

    let resolved: () => void;
    const waitForHistory = new Promise<void>((r) => { resolved = r; });
    mockFetchMemberHistory.mockImplementation(async () => {
      const result = sessions;
      resolved();
      return result;
    });

    const onAssignPress = jest.fn();

    const { getByTestId, getByText } = render(
      <MemberTrainingTab
        memberId="mem1"
        activePlan={plan}
        onAssignPress={onAssignPress}
      />,
    );

    await act(async () => { await waitForHistory; });

    expect(getByText('Strength Plan')).toBeTruthy();
    expect(getByTestId('history-session-sess1')).toBeTruthy();
    expect(getByTestId('history-session-sess2')).toBeTruthy();
  });

  it('shows assign-plan-button when no active plan', () => {
    mockFetchMemberHistory.mockResolvedValue([]);
    const onAssignPress = jest.fn();

    const { getByTestId } = render(
      <MemberTrainingTab
        memberId="mem1"
        activePlan={null}
        onAssignPress={onAssignPress}
      />,
    );

    expect(getByTestId('assign-plan-button')).toBeTruthy();
    fireEvent.press(getByTestId('assign-plan-button'));
    expect(onAssignPress).toHaveBeenCalled();
  });
});
