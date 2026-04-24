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
    render(<PlanTemplateForm onSubmit={onSubmit} />);

    await user.type(await screen.findByLabelText(/Plan Name/i), 'Push Pull Legs');
    fireEvent.click(await screen.findByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Push Pull Legs' }),
    ));
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
