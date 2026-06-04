/**
 * Stage 3 unit tests — MyTrainingScreen
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockFetchPlan = jest.fn();
const mockStartWorkout = jest.fn();

jest.mock('../../stores/training.store', () => ({
  useTrainingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useTrainingStore } from '../../stores/training.store';
import { ActivePlan, PlanDay, WorkoutSession } from '../../types/training';
import { MyTrainingScreen } from './MyTrainingScreen';

const mockUseTrainingStore = useTrainingStore as jest.MockedFunction<typeof useTrainingStore>;

function makeDay(overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    dayNumber: 1,
    name: 'Day 1 - Push',
    exercises: [
      {
        groupId: 'g1',
        isSuperset: false,
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        imageUrl: null,
        isBodyweight: false,
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        restSeconds: 90,
      },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActivePlan> = {}): ActivePlan {
  return {
    _id: 'plan1',
    name: 'Strength Plan',
    templateId: 'tpl1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    days: [makeDay({ dayNumber: 1, name: 'Day 1 - Push' }), makeDay({ dayNumber: 2, name: 'Day 2 - Pull' })],
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
    completedAt: null,
    sets: [],
    ...overrides,
  };
}

function setupStore(plan: ActivePlan | null, loading = false) {
  const state = {
    plan,
    activeSession: null,
    loading,
    error: null,
    fetchPlan: mockFetchPlan,
    startWorkout: mockStartWorkout,
    logSet: jest.fn(),
    finishWorkout: jest.fn(),
    loggedSetCount: jest.fn().mockReturnValue(0),
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
  mockFetchPlan.mockResolvedValue(undefined);
  mockStartWorkout.mockResolvedValue(makeSession());
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MyTrainingScreen', () => {
  it('renders a workout-day-{n} card per plan day with the day name', () => {
    const plan = makePlan();
    setupStore(plan);

    const { getByTestId, getByText } = render(<MyTrainingScreen />);

    expect(getByTestId('screen-MyTraining')).toBeTruthy();
    expect(getByTestId('workout-day-1')).toBeTruthy();
    expect(getByTestId('workout-day-2')).toBeTruthy();
    expect(getByText('Day 1 - Push')).toBeTruthy();
    expect(getByText('Day 2 - Pull')).toBeTruthy();
  });

  it('renders my-training-empty when the store plan is null', () => {
    setupStore(null);

    const { getByTestId, queryByTestId } = render(<MyTrainingScreen />);

    expect(getByTestId('my-training-empty')).toBeTruthy();
    expect(queryByTestId('workout-day-1')).toBeNull();
  });

  it('tapping a day card calls startWorkout with that dayNumber and navigates to WorkoutSession', async () => {
    const plan = makePlan();
    const session = makeSession({ dayNumber: 1 });
    mockStartWorkout.mockResolvedValue(session);
    setupStore(plan);

    const { getByTestId } = render(<MyTrainingScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('workout-day-1'));
    });

    expect(mockStartWorkout).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('WorkoutSession', { session });
  });
});
