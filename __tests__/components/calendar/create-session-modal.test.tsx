import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateSessionModal } from '@/components/calendar/create-session-modal';

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ sessions: [] }),
}) as jest.Mock;

const baseProps = {
  open: true,
  defaultDate: '2026-05-04',
  defaultStartTime: '09:00',
  trainers: [{ _id: 't1', name: 'Mike' }],
  members: [{ _id: 'm1', name: 'Alice', trainerId: 't1' }],
  currentUserRole: 'trainer' as const,
  currentUserId: 't1',
  onSuccess: jest.fn(),
  onClose: jest.fn(),
};

describe('CreateSessionModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders form fields', () => {
    render(<CreateSessionModal {...baseProps} />);
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    render(<CreateSessionModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('submits POST /api/schedule and calls fetch', async () => {
    render(<CreateSessionModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/schedule',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
