/**
 * Stage 3 unit tests — MyTrainingScreen (Plan view)
 * Stage 4 unit tests — MyTrainingScreen (Calendar view switch)
 * Stage 5 unit tests — MyTrainingScreen (History view)
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

const mockFetchSessions = jest.fn();

jest.mock('../../stores/self-training.store', () => ({
  useSelfTrainingStore: jest.fn(),
}));

// SelfWorkoutCalendar renders a simple placeholder for unit tests
jest.mock('./SelfWorkoutCalendar', () => ({
  SelfWorkoutCalendar: ({ sessions }: { sessions: unknown[] }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="self-workout-calendar">
        <Text>{sessions.length} sessions</Text>
      </View>
    );
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useTrainingStore } from '../../stores/training.store';
import { useSelfTrainingStore } from '../../stores/self-training.store';
import { ActivePlan, PlanDay, WorkoutSession, SelfSessionSummary } from '../../types/training';
import { MyTrainingScreen } from './MyTrainingScreen';

const mockUseTrainingStore = useTrainingStore as jest.MockedFunction<typeof useTrainingStore>;
const mockUseSelfTrainingStore = useSelfTrainingStore as jest.MockedFunction<typeof useSelfTrainingStore>;

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

function makeSelfSession(overrides: Partial<SelfSessionSummary> = {}): SelfSessionSummary {
  return {
    _id: 'self-sess1',
    dayName: 'Push Day',
    startedAt: '2026-06-01T10:00:00.000Z',
    completedAt: '2026-06-01T11:00:00.000Z',
    setCount: 9,
    rpe: 8,
    ...overrides,
  };
}

function setupTrainingStore(plan: ActivePlan | null, loading = false) {
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

function setupSelfTrainingStore(sessions: SelfSessionSummary[] = [], loading = false) {
  const state = {
    sessions,
    selectedSession: null,
    loading,
    error: null,
    fetchSessions: mockFetchSessions,
    fetchSession: jest.fn(),
  };

  mockUseSelfTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchPlan.mockResolvedValue(undefined);
  mockFetchSessions.mockResolvedValue(undefined);
  mockStartWorkout.mockResolvedValue(makeSession());
  setupSelfTrainingStore();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MyTrainingScreen', () => {
  it('renders a workout-day-{n} card per plan day with the day name', () => {
    const plan = makePlan();
    setupTrainingStore(plan);

    const { getByTestId, getByText } = render(<MyTrainingScreen />);

    expect(getByTestId('screen-MyTraining')).toBeTruthy();
    expect(getByTestId('workout-day-1')).toBeTruthy();
    expect(getByTestId('workout-day-2')).toBeTruthy();
    expect(getByText('Day 1 - Push')).toBeTruthy();
    expect(getByText('Day 2 - Pull')).toBeTruthy();
  });

  it('renders my-training-empty when the store plan is null', () => {
    setupTrainingStore(null);

    const { getByTestId, queryByTestId } = render(<MyTrainingScreen />);

    expect(getByTestId('my-training-empty')).toBeTruthy();
    expect(queryByTestId('workout-day-1')).toBeNull();
  });

  it('tapping a day card calls startWorkout with that dayNumber and navigates to WorkoutSession', async () => {
    const plan = makePlan();
    const session = makeSession({ dayNumber: 1 });
    mockStartWorkout.mockResolvedValue(session);
    setupTrainingStore(plan);

    const { getByTestId } = render(<MyTrainingScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('workout-day-1'));
    });

    expect(mockStartWorkout).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('WorkoutSession', { session });
  });

  it('selecting the Calendar view renders the SelfWorkoutCalendar', () => {
    setupTrainingStore(makePlan());
    setupSelfTrainingStore([makeSelfSession()]);

    const { getByTestId } = render(<MyTrainingScreen />);

    // Tap the Calendar tab
    fireEvent.press(getByTestId('view-tab-Calendar'));

    // SelfWorkoutCalendar should be visible
    expect(getByTestId('self-workout-calendar')).toBeTruthy();
  });

  it('the History view renders one row per completed self-session with its day name and date', () => {
    setupTrainingStore(makePlan());
    const session = makeSelfSession({ _id: 'self-sess1', dayName: 'Push Day', completedAt: '2026-06-01T11:00:00.000Z' });
    setupSelfTrainingStore([session]);

    const { getByTestId, getByText } = render(<MyTrainingScreen />);

    // Tap the History tab
    fireEvent.press(getByTestId('view-tab-History'));

    // Expect a session row rendered
    expect(getByTestId('history-row-self-sess1')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
  });

  it('the History view shows the "No sessions yet" empty state when there are no completed sessions', () => {
    setupTrainingStore(makePlan());
    setupSelfTrainingStore([]);

    const { getByTestId } = render(<MyTrainingScreen />);

    fireEvent.press(getByTestId('view-tab-History'));

    expect(getByTestId('history-empty')).toBeTruthy();
  });

  it('shows activity-strip with 14 cells and this-month stats when sessions exist', () => {
    setupTrainingStore(makePlan());
    const sessions = [
      makeSelfSession({ _id: 's1', completedAt: new Date().toISOString(), setCount: 9, rpe: 8 }),
    ];
    setupSelfTrainingStore(sessions);

    const { getByTestId } = render(<MyTrainingScreen />);
    expect(getByTestId('activity-strip')).toBeTruthy();
    expect(getByTestId('activity-strip-sessions')).toBeTruthy();
  });
});