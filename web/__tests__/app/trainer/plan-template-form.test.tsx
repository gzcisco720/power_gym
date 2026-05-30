import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanTemplateForm } from '@/app/(dashboard)/trainer/plans/_components/plan-template-form';

describe('PlanTemplateForm', () => {
  it('renders name and description fields', async () => {
    render(<PlanTemplateForm onSubmit={jest.fn()} />);
    expect(await screen.findByLabelText(/Plan Name/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('can add a day', async () => {
    render(<PlanTemplateForm onSubmit={jest.fn()} />);
    const addDayBtn = await screen.findByRole('button', { name: /Add Day/i });
    fireEvent.click(addDayBtn);
    expect(await screen.findByPlaceholderText(/Day 1/i)).toBeInTheDocument();
  });

  it('calls onSubmit with plan data on save', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <PlanTemplateForm
        onSubmit={onSubmit}
        initialData={{
          name: 'Old Name',
          description: null,
          days: [
            {
              dayNumber: 1,
              name: 'Day 1',
              exercises: [
                {
                  groupId: 'ex-1',
                  isSuperset: false,
                  exerciseId: 'ex-1' as never,
                  exerciseName: 'Squat',
                  imageUrl: null,
                  isBodyweight: false,
                  sets: 3,
                  repsMin: 8,
                  repsMax: 12,
                  restSeconds: 120,
                },
              ],
            },
          ],
        }}
      />,
    );

    // Trigger dirtiness so the Save button enables under new contract.
    const nameInput = await screen.findByLabelText(/Plan Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Push Pull Legs');
    fireEvent.click(await screen.findByRole('button', { name: /Save Plan/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Push Pull Legs' }),
      ),
    );
  });

  it('pre-fills fields when initialData provided', async () => {
    render(<PlanTemplateForm
      onSubmit={jest.fn()}
      initialData={{ name: 'Existing Plan', description: 'A desc', days: [] }}
    />);
    expect(await screen.findByDisplayValue('Existing Plan')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('A desc')).toBeInTheDocument();
  });
});
