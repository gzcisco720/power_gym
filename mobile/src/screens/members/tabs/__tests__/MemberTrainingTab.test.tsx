/**
 * Stage 3 unit tests — MemberTrainingTab (Log Session flow)
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

const mockFetchMemberPlan = jest.fn();
const mockStartMemberSession = jest.fn();
const mockFetchMemberHistory = jest.fn();

jest.mock('../../../../lib/api/training.api', () => ({
  fetchMemberHistory: (...args: Parameters<typeof mockFetchMemberHistory>) =>
    mockFetchMemberHistory(...args),
}));

jest.mock('../../../../stores/training.store', () => ({
  useTrainingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────name ────────────────
import { useTrainingStore } from '../../../../stores/training.store';
import { ActivePlan, PlanDay } from '../../../../types/training';
import { MemberTrainingTab } from '../MemberTrainingTab';

const mockUseTrainingStore = useTrainingStore as jest.MockedFunction<typeof useTrainingStore>;

function makeDay(overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    dayNumber: 1,
    name: 'Day 1 - Push',
    exercises: [],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActivePlan> = {}): ActivePlan {
  return {
    _id: 'plan1',
    name: 'Strength Plan',
    templateId: 'tpl1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    days: [makeDay({ dayNumber: 1 }), makeDay({ dayNumber: 2, name: 'Day 2 - Pull' })],
    ...overrides,
  };
}

function setupStore() {
  const state = {
    fetchMemberPlan: mockFetchMemberPlan,
    startMemberSession: mockStartMemberSession,
    memberSession: null,
  };

  mockUseTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchMemberHistory.mockResolvedValue([]);
  mockFetchMemberPlan.mockResolvedValue(null);
  mockStartMemberSession.mockResolvedValue({ _id: 'sess1' });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MemberTrainingTab', () => {
  it('renders a Log Session day button per plan day when fetchMemberPlan returns a plan', async () => {
    const plan = makePlan();
    mockFetchMemberPlan.mockResolvedValue(plan);
    setupStore();

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

    expect(getByTestId('log-session-day-1')).toBeTruthy();
    expect(getByTestId('log-session-day-2')).toBeTruthy();
  });

  it('renders no Log Session button when fetchMemberPlan returns null', async () => {
    mockFetchMemberPlan.mockResolvedValue(null);
    setupStore();

    const { queryByTestId } = render(
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

    expect(queryByTestId('log-session-day-1')).toBeNull();
  });

  it('tapping a day button calls startMemberSession(memberId, dayNumber) then navigates to TrainerWorkoutSession with memberId and memberName', async () => {
    const plan = makePlan();
    mockFetchMemberPlan.mockResolvedValue(plan);
    setupStore();

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

    await act(async () => {
      fireEvent.press(getByTestId('log-session-day-1'));
    });

    expect(mockStartMemberSession).toHaveBeenCalledWith('mem1', 1);
    expect(mockNavigate).toHaveBeenCalledWith('TrainerWorkoutSession', {
      memberId: 'mem1',
      memberName: 'Alice Smith',
    });
  });
});
