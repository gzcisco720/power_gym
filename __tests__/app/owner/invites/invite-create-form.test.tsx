import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteCreateForm } from '@/app/(dashboard)/owner/invites/_components/invite-create-form';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe('InviteCreateForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when invite is created successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ inviteUrl: 'http://localhost:3000/register?token=abc' }),
    });
    render(<InviteCreateForm trainers={[{ _id: 't1', name: 'Trainer A' }]} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invite link generated'),
    );
  });

  it('calls toast.error with server message when invite creation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already invited' }),
    });
    render(<InviteCreateForm trainers={[{ _id: 't1', name: 'Trainer A' }]} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Email already invited'),
    );
  });
});
