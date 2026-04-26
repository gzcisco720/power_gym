import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const defaultProps = {
  memberId: 'm1',
  memberName: 'Test Member',
  currentTrainerId: 't1',
  trainers: [
    { _id: 't1', name: 'Trainer A' },
    { _id: 't2', name: 'Trainer B' },
  ],
  onClose: jest.fn(),
};

describe('ReassignModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success on successful reassign', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Member reassigned'),
    );
  });

  it('calls toast.error with server message when reassign fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Member not found' }),
    });
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Member not found'),
    );
  });

  it('calls toast.error with fallback when server returns no error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to reassign member'),
    );
  });

  it('calls toast.error when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<ReassignModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Something went wrong'),
    );
  });
});
