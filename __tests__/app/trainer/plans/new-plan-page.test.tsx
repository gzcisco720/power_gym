import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewPlanClient } from '@/app/(dashboard)/trainer/plans/new/_client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('NewPlanPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when plan is saved successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ _id: 'p1' }) });
    render(<NewPlanClient exercises={[]} backPath="/trainer/plans" />);
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Plan/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan saved'));
  });

  it('calls toast.error with server message when save fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Plan name already exists' }),
    });
    render(<NewPlanClient exercises={[]} backPath="/trainer/plans" />);
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My New Plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Plan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plan name already exists'));
  });
});
