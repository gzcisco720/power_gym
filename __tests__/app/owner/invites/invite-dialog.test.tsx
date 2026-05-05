import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteDialog } from '@/app/(dashboard)/owner/invites/_components/invite-dialog';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockTrainers = [{ _id: 't1', name: 'Li Wei' }];

describe('InviteDialog', () => {
  const onOpenChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders role selector and email input when open', () => {
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('does not render form content when closed', () => {
    render(<InviteDialog open={false} trainers={mockTrainers} onOpenChange={onOpenChange} />);
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument();
  });

  it('shows trainer selector when member role selected', () => {
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'member' } });
    expect(screen.getByLabelText(/Assign to Trainer/i)).toBeInTheDocument();
  });

  it('calls toast.success when invite is created successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ inviteUrl: 'http://localhost:3000/register?token=abc' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invite link generated'),
    );
  });

  it('shows generated invite URL after success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=tok' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@gym.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect(screen.getByText(/register\?token=tok/)).toBeInTheDocument());
  });

  it('calls toast.error with server message when invite creation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already invited' }),
    });
    render(<InviteDialog open trainers={mockTrainers} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Email already invited'),
    );
  });
});
