import { render, screen, fireEvent } from '@testing-library/react';
import { SupersetBlock } from '@/components/training/superset-block';
import type { ExerciseRowData } from '@/components/training/exercise-row';

const exA: ExerciseRowData = {
  exerciseId: 'a',
  exerciseName: 'Lat Pulldown',
  imageUrl: null,
  isBodyweight: false,
  groupId: 'g1',
  isSuperset: true,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 60,
};
const exB: ExerciseRowData = { ...exA, exerciseId: 'b', exerciseName: 'Cable Row' };

describe('SupersetBlock (edit mode)', () => {
  function renderBlock(overrides: Record<string, unknown> = {}) {
    return render(
      <SupersetBlock
        mode="edit"
        groupId="g1"
        members={[
          { row: exA, label: 'B1' },
          { row: exB, label: 'B2' },
        ]}
        onChangeRow={() => {}}
        onMoveRow={() => {}}
        onDeleteRow={() => {}}
        onAddToSuperset={() => {}}
        onUngroup={() => {}}
        onDeleteSuperset={() => {}}
        {...overrides}
      />,
    );
  }

  it('renders the Superset header with Ungroup and Delete superset buttons', () => {
    renderBlock();
    expect(screen.getByText(/^superset$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ungroup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete superset/i })).toBeInTheDocument();
  });

  it('renders one ExerciseRow per member', () => {
    renderBlock();
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument();
    expect(screen.getByText('Cable Row')).toBeInTheDocument();
  });

  it('renders an Add to Superset entry', () => {
    renderBlock();
    expect(screen.getByRole('button', { name: /add to superset/i })).toBeInTheDocument();
  });

  it('calls onAddToSuperset when entry clicked', () => {
    const fn = jest.fn();
    renderBlock({ onAddToSuperset: fn });
    fireEvent.click(screen.getByRole('button', { name: /add to superset/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onUngroup when Ungroup clicked', () => {
    const fn = jest.fn();
    renderBlock({ onUngroup: fn });
    fireEvent.click(screen.getByRole('button', { name: /ungroup/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('opens confirm dialog when Delete superset clicked, calls onDeleteSuperset on confirm', () => {
    const fn = jest.fn();
    renderBlock({ onDeleteSuperset: fn });
    fireEvent.click(screen.getByRole('button', { name: /delete superset/i }));
    expect(screen.getByText(/delete this superset/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('disables internal move-up at first member and move-down at last member', () => {
    renderBlock();
    const moveUps = screen.getAllByRole('button', { name: /move up/i });
    const moveDowns = screen.getAllByRole('button', { name: /move down/i });
    expect(moveUps[0]).toBeDisabled();
    expect(moveUps[1]).toBeEnabled();
    expect(moveDowns[0]).toBeEnabled();
    expect(moveDowns[1]).toBeDisabled();
  });

  it('renders empty body but still allows Add to Superset when members is empty', () => {
    renderBlock({ members: [] });
    expect(screen.getByRole('button', { name: /add to superset/i })).toBeInTheDocument();
    expect(screen.queryByText('Lat Pulldown')).not.toBeInTheDocument();
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = renderBlock();
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});

describe('SupersetBlock (view mode)', () => {
  it('renders a header and view rows for each member', () => {
    render(
      <SupersetBlock
        mode="view"
        groupId="g1"
        viewMembers={[
          { row: exA, label: 'B1' },
          { row: exB, label: 'B2' },
        ]}
      />,
    );
    expect(screen.getByText(/^superset$/i)).toBeInTheDocument();
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument();
    expect(screen.getByText('Cable Row')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ungroup/i })).toBeNull();
  });
});
