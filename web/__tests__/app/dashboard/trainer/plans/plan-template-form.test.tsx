import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanTemplateForm } from '@/app/(dashboard)/trainer/plans/_components/plan-template-form';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

import { toast } from 'sonner';

const mockExercises = [
  { _id: 'ex-squat', name: 'Squat', imageUrl: null, isBodyweight: false } as never,
  { _id: 'ex-bench', name: 'Bench Press', imageUrl: null, isBodyweight: false } as never,
];

describe('PlanTemplateForm — new contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks submit when no days', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<PlanTemplateForm onSubmit={onSubmit} exercises={mockExercises} />);
    await user.type(screen.getByLabelText(/plan name/i), 'My Plan');
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Add at least one day'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit when a day has no exercises', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<PlanTemplateForm onSubmit={onSubmit} exercises={mockExercises} />);
    await user.type(screen.getByLabelText(/plan name/i), 'P');
    fireEvent.click(screen.getByRole('button', { name: /\+ add day/i }));
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('opens degrade dialog for a single-member superset and degrades on Continue', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <PlanTemplateForm
        onSubmit={onSubmit}
        exercises={mockExercises}
        initialData={{
          name: 'Old Name',
          description: null,
          days: [
            {
              dayNumber: 1,
              name: 'Day 1',
              exercises: [
                {
                  exerciseId: 'ex-squat' as never,
                  exerciseName: 'Squat',
                  imageUrl: null,
                  isBodyweight: false,
                  groupId: 'g-only-one',
                  isSuperset: true,
                  sets: 3,
                  repsMin: 8,
                  repsMax: 12,
                  restSeconds: 60,
                },
              ],
            },
          ],
        }}
      />,
    );
    const nameInput = screen.getByLabelText(/plan name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() =>
      expect(screen.getByText(/single-exercise supersets detected/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /continue & save/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const arg = onSubmit.mock.calls[0][0] as {
      days: { exercises: { isSuperset: boolean; groupId: string; exerciseId: unknown }[] }[];
    };
    const ex = arg.days[0].exercises[0];
    expect(ex.isSuperset).toBe(false);
    expect(String(ex.groupId)).toBe('ex-squat');
  });

  it('shows discard dialog when Cancel pressed with dirty form', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    render(
      <PlanTemplateForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        exercises={mockExercises}
        initialData={{ name: 'X', description: null, days: [] }}
      />,
    );
    await user.type(screen.getByLabelText(/plan name/i), 'YY');
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
