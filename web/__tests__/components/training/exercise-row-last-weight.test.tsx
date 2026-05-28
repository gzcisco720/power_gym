import { render, screen } from '@testing-library/react';
import { ExerciseRow, type ExerciseRowData, type LoggingSetInput } from '@/components/training/exercise-row';
import type { LastWeightHintDTO } from '@/lib/training/progressive-overload';

const baseRow: ExerciseRowData = {
  exerciseId: 'ex1',
  exerciseName: 'Bench Press',
  imageUrl: null,
  isBodyweight: false,
  groupId: 'ex1',
  isSuperset: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: null,
};

const bwRow: ExerciseRowData = {
  ...baseRow,
  exerciseName: 'Pull-Ups',
  isBodyweight: true,
};

const baseLoggingSet: LoggingSetInput = {
  setNumber: 1,
  prescribedRepsMin: 8,
  prescribedRepsMax: 12,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
  globalIndex: 0,
};

const hint2x: LastWeightHintDTO = {
  exerciseId: 'ex1',
  lastWeight: 80,
  lastReps: 12,
  lastDate: new Date('2026-05-19').toISOString(),
  consecutiveMaxHits: 2,
};

const hint1x: LastWeightHintDTO = {
  ...hint2x,
  consecutiveMaxHits: 1,
};

const hint0x: LastWeightHintDTO = {
  ...hint2x,
  lastReps: 8,
  consecutiveMaxHits: 0,
};

function renderLogging(
  overrides: {
    row?: ExerciseRowData;
    hint?: LastWeightHintDTO;
    inputs?: { weight: string; reps: string }[];
    readOnly?: boolean;
  } = {},
) {
  const row = overrides.row ?? baseRow;
  const loggingSets: LoggingSetInput[] = [{ ...baseLoggingSet }];
  const inputs = overrides.inputs ?? [{ weight: '', reps: '' }];

  return render(
    <ExerciseRow
      mode="logging"
      row={row}
      label="A"
      loggingSets={loggingSets}
      inputs={inputs}
      onInputChange={() => {}}
      onDeleteSet={() => {}}
      onAddSet={() => {}}
      onBwToggle={() => {}}
      readOnly={overrides.readOnly ?? false}
      lastWeightHint={overrides.hint}
    />,
  );
}

describe('ExerciseRow — last weight hint', () => {
  it('shows last weight and reps when hint provided', () => {
    renderLogging({ hint: hint2x });
    expect(screen.getByTestId('last-weight-hint')).toBeInTheDocument();
    expect(screen.getByText(/Last: 80 kg × 12/)).toBeInTheDocument();
  });

  it('shows "Try X kg" badge when consecutiveMaxHits >= 2', () => {
    renderLogging({ hint: hint2x });
    const badge = screen.getByTestId('try-heavier-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('84.0 kg');
  });

  it('shows "1 more session" nudge when consecutiveMaxHits === 1', () => {
    renderLogging({ hint: hint1x });
    expect(screen.getByTestId('almost-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('try-heavier-badge')).not.toBeInTheDocument();
  });

  it('shows only hint text when consecutiveMaxHits === 0 (missed max reps)', () => {
    renderLogging({ hint: hint0x });
    expect(screen.getByTestId('last-weight-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('try-heavier-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('almost-badge')).not.toBeInTheDocument();
  });

  it('does NOT render hint when no hint provided', () => {
    renderLogging();
    expect(screen.queryByTestId('last-weight-hint')).not.toBeInTheDocument();
  });

  it('does NOT render hint for bodyweight exercises', () => {
    renderLogging({ row: bwRow, hint: hint2x });
    expect(screen.queryByTestId('last-weight-hint')).not.toBeInTheDocument();
  });

  it('hides hint when user has typed a weight (hasUserInput)', () => {
    renderLogging({ hint: hint2x, inputs: [{ weight: '75', reps: '' }] });
    expect(screen.queryByTestId('last-weight-hint')).not.toBeInTheDocument();
  });

  it('does NOT render hint in readOnly mode', () => {
    renderLogging({ hint: hint2x, readOnly: true });
    expect(screen.queryByTestId('last-weight-hint')).not.toBeInTheDocument();
  });
});
