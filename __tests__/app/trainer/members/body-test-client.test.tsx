import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BodyTestClient, type BodyTestRecord } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockRecord: BodyTestRecord = {
  _id: 'bt1',
  date: new Date().toISOString(),
  protocol: 'other',
  weight: 75,
  bodyFatPct: 18,
  leanMassKg: 61.5,
  fatMassKg: 13.5,
  targetWeight: null,
  targetBodyFatPct: null,
};

describe('BodyTestClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when body test is saved successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRecord,
    });
    render(<BodyTestClient memberId="m1" memberName="Test Member" initialTests={[]} />);
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Body Fat (%)'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Body test saved'));
  });

  it('calls toast.error with server message when save fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid measurements' }),
    });
    render(<BodyTestClient memberId="m1" memberName="Test Member" initialTests={[]} />);
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Body Fat (%)'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid measurements'));
  });
});
