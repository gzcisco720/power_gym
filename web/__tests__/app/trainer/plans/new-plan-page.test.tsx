import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewPlanClient } from '@/app/(dashboard)/trainer/plans/new/_client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockExercises = [
  {
    _id: 'ex-squat',
    name: 'Squat',
    muscleGroup: null,
    imageUrl: null,
    isBodyweight: false,
  },
];

async function buildMinimalValidPlan(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/plan name/i), 'My New Plan');
  fireEvent.click(screen.getByRole('button', { name: /\+ add day/i }));
  fireEvent.click(screen.getByRole('button', { name: /\+ add exercise/i }));
  // Sheet opens; pick the only exercise
  await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Squat'));
}

describe('NewPlanPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when plan is saved successfully', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ _id: 'p1' }) });
    render(<NewPlanClient exercises={mockExercises} backPath="/trainer/plans" />);

    await buildMinimalValidPlan(user);
    fireEvent.click(screen.getByRole('button', { name: /Save Plan/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan saved'));
  });

  it('calls toast.error with server message when save fails', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Plan name already exists' }),
    });
    render(<NewPlanClient exercises={mockExercises} backPath="/trainer/plans" />);

    await buildMinimalValidPlan(user);
    fireEvent.click(screen.getByRole('button', { name: /Save Plan/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Plan name already exists'),
    );
  });
});
