/**
 * Stage 3 unit tests — StrengthProgressChart
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetchMemberExerciseHistory = jest.fn();

jest.mock('../../../../lib/api/training.api', () => ({
  fetchMemberExerciseHistory: (...args: Parameters<typeof mockFetchMemberExerciseHistory>) =>
    mockFetchMemberExerciseHistory(...args),
}));

// LineChart uses react-native-svg which requires a native module — mock it
jest.mock('react-native-gifted-charts', () => ({
  LineChart: ({ data, testID }: { data: { value: number }[]; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID ?? 'line-chart'}>
        {data.map((point, i) => (
          <Text key={i} testID={`chart-point-${i}`}>
            {String(point.value)}
          </Text>
        ))}
      </View>
    );
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { StrengthProgressChart } from './StrengthProgressChart';
import { ExerciseHistoryPoint, ExerciseRef } from '../../../../types/training';

function makeExercise(overrides: Partial<ExerciseRef> = {}): ExerciseRef {
  return {
    exerciseId: 'ex1',
    exerciseName: 'Bench Press',
    ...overrides,
  };
}

function makePoint(overrides: Partial<ExerciseHistoryPoint> = {}): ExerciseHistoryPoint {
  return {
    date: '2026-06-01',
    estimatedOneRM: 117,
    weight: 100,
    reps: 5,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StrengthProgressChart', () => {
  it('renders exercise pills for each exercise', () => {
    const exercises: ExerciseRef[] = [
      makeExercise({ exerciseId: 'ex1', exerciseName: 'Bench Press' }),
      makeExercise({ exerciseId: 'ex2', exerciseName: 'Back Squat' }),
    ];
    mockFetchMemberExerciseHistory.mockResolvedValue([]);

    const { getByTestId } = render(
      <StrengthProgressChart memberId="mem1" exercises={exercises} />,
    );

    expect(getByTestId('strength-pill-ex1')).toBeTruthy();
    expect(getByTestId('strength-pill-ex2')).toBeTruthy();
  });

  it('selects an exercise and refetches history, rendering a line point per session', async () => {
    const exercises: ExerciseRef[] = [
      makeExercise({ exerciseId: 'ex1', exerciseName: 'Bench Press' }),
    ];
    const history: ExerciseHistoryPoint[] = [
      makePoint({ date: '2026-06-01', estimatedOneRM: 117 }),
      makePoint({ date: '2026-06-08', estimatedOneRM: 120 }),
    ];
    mockFetchMemberExerciseHistory.mockResolvedValue(history);

    const { getByTestId } = render(
      <StrengthProgressChart memberId="mem1" exercises={exercises} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('strength-pill-ex1'));
    });

    expect(mockFetchMemberExerciseHistory).toHaveBeenCalledWith('mem1', 'ex1');

    // Chart should render one point per history entry
    expect(getByTestId('chart-point-0')).toBeTruthy();
    expect(getByTestId('chart-point-1')).toBeTruthy();
  });

  it('shows empty state when no exercises provided', () => {
    const { getByTestId } = render(
      <StrengthProgressChart memberId="mem1" exercises={[]} />,
    );
    expect(getByTestId('strength-chart-empty')).toBeTruthy();
  });
});
