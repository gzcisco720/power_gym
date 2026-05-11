import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseRow, type ExerciseRowData, type LoggingSetInput } from '@/components/training/exercise-row';

const baseRow: ExerciseRowData = {
  exerciseId: 'ex1',
  exerciseName: 'Squat',
  imageUrl: null,
  isBodyweight: false,
  groupId: 'ex1',
  isSuperset: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 120,
};

describe('ExerciseRow (edit mode)', () => {
  function renderEdit(overrides: Partial<Parameters<typeof ExerciseRow>[0]> = {}) {
    return render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
        {...overrides}
      />,
    );
  }

  it('renders label, name, and all numeric inputs with current values', () => {
    renderEdit();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByLabelText(/^sets$/i)).toHaveValue('3');
    expect(screen.getByLabelText(/reps min/i)).toHaveValue('8');
    expect(screen.getByLabelText(/reps max/i)).toHaveValue('12');
    expect(screen.getByLabelText(/^rest$/i)).toHaveValue('120');
  });

  it('numeric inputs use inputMode="decimal" not type="number"', () => {
    renderEdit();
    const sets = screen.getByLabelText(/^sets$/i);
    expect(sets).toHaveAttribute('inputMode', 'decimal');
    expect(sets).not.toHaveAttribute('type', 'number');
  });

  it('disables move-up at first position and move-down at last position', () => {
    const { rerender } = renderEdit({ position: 'first' });
    expect(screen.getByRole('button', { name: /move up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move down/i })).toBeEnabled();
    rerender(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="last"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /move up/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /move down/i })).toBeDisabled();
  });

  it('fires onChange("sets", 5) when sets input changes', () => {
    const onChange = jest.fn();
    renderEdit({ onChange });
    fireEvent.change(screen.getByLabelText(/^sets$/i), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('sets', 5);
  });

  it('fires onChange("isBodyweight", true) when BW is toggled', () => {
    const onChange = jest.fn();
    renderEdit({ onChange });
    fireEvent.click(screen.getByLabelText(/^bw$/i));
    expect(onChange).toHaveBeenCalledWith('isBodyweight', true);
  });

  it('fires onDelete when × clicked', () => {
    const onDelete = jest.fn();
    renderEdit({ onDelete });
    fireEvent.click(screen.getByRole('button', { name: /remove exercise/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows validation ring when hasError is true', () => {
    const { container } = renderEdit({ hasError: true });
    expect(container.querySelector('[data-testid="exercise-row"]')?.className ?? '')
      .toMatch(/ring-destructive/);
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = renderEdit();
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});

describe('logging mode — readOnly', () => {
  const loggingRow: ExerciseRowData = {
    exerciseId: 'ex2',
    exerciseName: 'Bench Press',
    imageUrl: null,
    isBodyweight: false,
    groupId: 'ex2',
    isSuperset: false,
    sets: 2,
    repsMin: 8,
    repsMax: 10,
    restSeconds: 90,
  };

  const completedSets: LoggingSetInput[] = [
    {
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      actualWeight: 80,
      actualReps: 9,
      completedAt: '2024-01-01T10:00:00Z',
      globalIndex: 0,
    },
    {
      setNumber: 2,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      actualWeight: null,
      actualReps: null,
      completedAt: '2024-01-01T10:05:00Z',
      globalIndex: 1,
    },
  ];

  const loggingCallbacks = {
    onInputChange: jest.fn(),
    onLogSet: jest.fn(),
    onAddSet: jest.fn(),
    onBwToggle: jest.fn(),
  };

  function renderLogging(readOnly: boolean | undefined) {
    return render(
      <ExerciseRow
        mode="logging"
        row={loggingRow}
        label="A"
        loggingSets={completedSets}
        inputs={[]}
        readOnly={readOnly}
        {...loggingCallbacks}
      />,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when readOnly={true}', () => {
    it('BW toggle checkbox is NOT in the document', () => {
      renderLogging(true);
      expect(screen.queryByRole('checkbox', { name: /^bw$/i })).not.toBeInTheDocument();
    });

    it('"+ Add Set" button is NOT in the document', () => {
      renderLogging(true);
      expect(screen.queryByText(/\+ add set/i)).not.toBeInTheDocument();
    });

    it('completed sets show their logged values', () => {
      renderLogging(true);
      // Set 1: weight=80 × reps=9
      expect(screen.getByText(/80 kg × 9 reps/i)).toBeInTheDocument();
      // Set 2: weight=null, reps=null → shows "–"
      expect(screen.getByText('–')).toBeInTheDocument();
    });
  });

  describe('when readOnly={false}', () => {
    it('BW toggle checkbox IS in the document', () => {
      renderLogging(false);
      expect(screen.getByRole('checkbox', { name: /^bw$/i })).toBeInTheDocument();
    });

    it('"+ Add Set" button IS in the document', () => {
      renderLogging(false);
      expect(screen.getByText(/\+ add set/i)).toBeInTheDocument();
    });
  });

  describe('when readOnly is omitted (defaults to interactive)', () => {
    it('BW toggle checkbox IS in the document', () => {
      renderLogging(undefined);
      expect(screen.getByRole('checkbox', { name: /^bw$/i })).toBeInTheDocument();
    });

    it('"+ Add Set" button IS in the document', () => {
      renderLogging(undefined);
      expect(screen.getByText(/\+ add set/i)).toBeInTheDocument();
    });
  });
});

describe('ExerciseRow (view mode)', () => {
  it('renders summary pills with no inputs and no chevrons', () => {
    render(
      <ExerciseRow
        mode="view"
        row={{
          exerciseId: 'a',
          exerciseName: 'Squat',
          imageUrl: null,
          isBodyweight: false,
          groupId: 'a',
          isSuperset: false,
          sets: 4,
          repsMin: 6,
          repsMax: 8,
          restSeconds: 90,
        }}
        label="A"
      />,
    );
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText(/sets:\s*4/i)).toBeInTheDocument();
    expect(screen.getByText(/reps:\s*6\s*–\s*8/i)).toBeInTheDocument();
    expect(screen.getByText(/rest:\s*90s/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^sets$/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /move up/i })).toBeNull();
  });

  it('renders BW pill when bodyweight', () => {
    render(
      <ExerciseRow
        mode="view"
        row={{
          exerciseId: 'a',
          exerciseName: 'Pullup',
          imageUrl: null,
          isBodyweight: true,
          groupId: 'a',
          isSuperset: false,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: null,
        }}
        label="A"
      />,
    );
    expect(screen.getByText('BW')).toBeInTheDocument();
    expect(screen.queryByText(/rest/i)).toBeNull();
  });
});
