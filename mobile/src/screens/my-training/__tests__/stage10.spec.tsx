/**
 * Stage 10 Sprint Contract tests — my-training
 *
 * Verifies:
 * 1. WorkoutSessionScreen > set complete > marks set done and calls log handler
 * 4. MyTrainingScreen > loading > renders Skeleton
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
  useRoute: jest.fn(),
}));

const mockLogSet = jest.fn();
const mockFinishWorkout = jest.fn();
const mockAddSet = jest.fn();
const mockDeleteSet = jest.fn();
const mockFetchPlan = jest.fn();
const mockStartWorkout = jest.fn();
const mockFetchSessions = jest.fn();

jest.mock('../../../stores/training.store', () => ({
  useTrainingStore: jest.fn(),
}));

jest.mock('../../../stores/self-training.store', () => ({
  useSelfTrainingStore: jest.fn(),
}));

jest.mock('../SelfWorkoutCalendar', () => ({
  SelfWorkoutCalendar: () => {
    const { View } = require('react-native');
    return <View testID="self-workout-calendar" />;
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useTrainingStore } from '../../../stores/training.store';
import { useSelfTrainingStore } from '../../../stores/self-training.store';
import { WorkoutSession, SessionSet, ActivePlan } from '../../../types/training';
import { WorkoutSessionScreen } from '../WorkoutSessionScreen';
import { MyTrainingScreen } from '../MyTrainingScreen';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTrainingStore = useTrainingStore as jest.MockedFunction<typeof useTrainingStore>;
const mockUseSelfTrainingStore = useSelfTrainingStore as jest.MockedFunction<typeof useSelfTrainingStore>;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    actualWeight: null,
    actualReps: null,
    completedAt: null,
    ...overrides,
  };
}

function makeWorkoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'sess1',
    memberId: 'mem1',
    memberPlanId: 'plan1',
    dayNumber: 1,
    dayName: 'Day 1 - Push',
    startedAt: '2026-06-04T10:00:00.000Z',
    completedAt: null,
    sets: [makeSet({ exerciseId: 'ex1', setNumber: 1 })],
    ...overrides,
  };
}


function setupWorkoutSessionStore(session: WorkoutSession) {
  const state = {
    plan: null,
    activeSession: session,
    loading: false,
    error: null,
    fetchPlan: jest.fn(),
    startWorkout: jest.fn(),
    logSet: mockLogSet,
    finishWorkout: mockFinishWorkout,
    addSet: mockAddSet,
    deleteSet: mockDeleteSet,
    loggedSetCount: jest.fn().mockReturnValue(0),
  };

  mockUseTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupMyTrainingStore(plan: ActivePlan | null, loading = false) {
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

function setupSelfTrainingStore() {
  const state = {
    sessions: [],
    selectedSession: null,
    loading: false,
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

function setupRoute(session: WorkoutSession) {
  mockUseRoute.mockReturnValue({
    key: 'WorkoutSession',
    name: 'WorkoutSession',
    params: { session },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogSet.mockResolvedValue(undefined);
  mockFinishWorkout.mockResolvedValue(undefined);
  mockAddSet.mockResolvedValue(undefined);
  mockDeleteSet.mockResolvedValue(undefined);
  mockFetchPlan.mockResolvedValue(undefined);
  mockFetchSessions.mockResolvedValue(undefined);
  mockStartWorkout.mockResolvedValue(makeWorkoutSession());
  setupSelfTrainingStore();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkoutSessionScreen', () => {
  describe('set complete', () => {
    it('marks set done and calls log handler', async () => {
      const session = makeWorkoutSession({
        sets: [makeSet({ exerciseId: 'ex1', setNumber: 1 })],
      });
      setupWorkoutSessionStore(session);
      setupRoute(session);

      const { getByTestId } = render(<WorkoutSessionScreen />);

      fireEvent.changeText(getByTestId('set-reps-ex1-1'), '10');
      fireEvent.changeText(getByTestId('set-weight-ex1-1'), '80');

      await act(async () => {
        fireEvent.press(getByTestId('log-set-ex1-1'));
      });

      expect(mockLogSet).toHaveBeenCalledWith({
        exerciseId: 'ex1',
        setNumber: 1,
        actualReps: 10,
        actualWeight: 80,
      });
    });
  });
});

describe('MyTrainingScreen', () => {
  describe('loading', () => {
    it('renders Skeleton while loading', () => {
      setupMyTrainingStore(null, true);

      const { getByTestId, getAllByTestId } = render(<MyTrainingScreen />);

      expect(getByTestId('screen-MyTraining')).toBeTruthy();
      // Skeleton rows render while loading=true
      expect(getAllByTestId('skeleton-item').length).toBeGreaterThan(0);
    });
  });
});
