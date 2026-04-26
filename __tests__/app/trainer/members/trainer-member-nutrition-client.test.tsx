import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockProps = {
  memberId: 'm1',
  memberName: 'Test Member',
  templates: [{ _id: 't1', name: 'Test Nutrition Plan' }],
  activePlan: null,
};

describe('TrainerMemberNutritionClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when nutrition plan is assigned successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<TrainerMemberNutritionClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Nutrition plan assigned'));
  });

  it('calls toast.error with server message when assignment fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Template not found' }),
    });
    render(<TrainerMemberNutritionClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Template not found'));
  });

  it('calls toast.error with fallback when server returns no message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<TrainerMemberNutritionClient {...mockProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /assign/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to assign nutrition plan'));
  });
});
