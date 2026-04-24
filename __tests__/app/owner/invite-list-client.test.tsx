import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteListClient } from '@/app/(dashboard)/owner/invites/_components/invite-list-client';

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
  trainerId: null,
};
const expired = {
  _id: 'i2',
  token: 'tok-xyz',
  role: 'trainer' as const,
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null,
  trainerId: null,
};

describe('InviteListClient', () => {
  it('renders pending invite email', () => {
    render(<InviteListClient invites={[pending, expired]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('calls DELETE on revoke click', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.confirm = jest.fn().mockReturnValue(true);
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/invites/i1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('calls POST resend on Resend click', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=new' }),
    });
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Resend/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/invites/i1/resend',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
