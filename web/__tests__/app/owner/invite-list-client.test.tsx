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

const pending: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i1',
  token: 'tok-abc',
  role: 'member',
  recipientEmail: 'a@b.com',
  expiresAt: new Date(now.getTime() + 86400000 * 3).toISOString(),
  usedAt: null,
  trainerId: null,
};

const expired: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i2',
  token: 'tok-xyz',
  role: 'trainer',
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null,
  trainerId: null,
};

const accepted: Parameters<typeof InviteListClient>[0]['invites'][number] = {
  _id: 'i3',
  token: 'tok-used',
  role: 'member',
  recipientEmail: 'c@d.com',
  expiresAt: new Date(now.getTime() + 86400000).toISOString(),
  usedAt: new Date(now.getTime() - 86400000).toISOString(),
  trainerId: null,
};

describe('InviteListClient', () => {
  it('renders pending invite email', () => {
    render(<InviteListClient invites={[pending, expired]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('shows trainer name in meta when invitedByMap provided', () => {
    render(
      <InviteListClient
        invites={[{ ...pending, invitedBy: 't1' }]}
        invitedByMap={{ t1: 'Li Wei' }}
      />,
    );
    expect(screen.getByText(/Li Wei/)).toBeInTheDocument();
  });

  it('renders Accepted section for used invites', () => {
    render(<InviteListClient invites={[accepted]} />);
    expect(screen.getByText('c@d.com')).toBeInTheDocument();
    expect(screen.getAllByText(/Accepted/i).length).toBeGreaterThan(0);
  });

  it('shows Copy Link and Resend buttons on pending rows', () => {
    render(<InviteListClient invites={[pending]} />);
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend/i })).toBeInTheDocument();
  });

  it('shows Regenerate button on expired rows (not Resend)', () => {
    render(<InviteListClient invites={[expired]} />);
    expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resend$/i })).not.toBeInTheDocument();
  });

  it('Copy Link writes token URL to clipboard without API call', () => {
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy Link/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('tok-abc'),
    );
  });

  it('opens AlertDialog on Revoke click, calls DELETE on confirm', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    render(<InviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    const confirmBtn = await screen.findByRole('button', { name: /Confirm Revoke/i });
    fireEvent.click(confirmBtn);
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
