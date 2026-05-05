import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerInviteListClient } from '@/app/(dashboard)/trainer/invites/_components/invite-list-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

const now = new Date();
const pending = {
  _id: 'i1',
  token: 'tok-abc',
  role: 'member' as const,
  recipientEmail: 'a@b.com',
  expiresAt: new Date(now.getTime() + 86400000).toISOString(),
  usedAt: null,
  trainerId: 't1',
};
const expired = {
  _id: 'i2',
  token: 'tok-xyz',
  role: 'member' as const,
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null,
  trainerId: 't1',
};

describe('TrainerInviteListClient', () => {
  it('renders pending invite email', () => {
    render(<TrainerInviteListClient invites={[pending, expired]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('calls DELETE on trainer endpoint when revoking', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.confirm = jest.fn().mockReturnValue(true);
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/trainer/invites/i1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('calls POST on trainer resend endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=new' }),
    });
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Resend/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/trainer/invites/i1/resend',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
