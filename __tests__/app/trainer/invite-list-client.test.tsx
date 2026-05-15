import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { TrainerInviteListClient } from '@/app/(dashboard)/trainer/invites/_components/invite-list-client';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

const now = new Date();
const pending = {
  _id: 'i1', token: 'tok-abc', role: 'member' as const,
  recipientEmail: 'a@b.com',
  expiresAt: new Date(now.getTime() + 6 * 86400000).toISOString(),
  usedAt: null, trainerId: 't1',
};
const accepted = {
  _id: 'i3', token: 'tok-used', role: 'member' as const,
  recipientEmail: 'c@d.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
  trainerId: 't1',
};
const expired = {
  _id: 'i2', token: 'tok-xyz', role: 'member' as const,
  recipientEmail: 'b@c.com',
  expiresAt: new Date(now.getTime() - 86400000).toISOString(),
  usedAt: null, trainerId: 't1',
};

describe('TrainerInviteListClient', () => {
  it('renders KPI strip with pending and accepted counts', () => {
    render(<TrainerInviteListClient invites={[pending, accepted, expired]} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('renders pending invite email with Copy Link, Resend, and Revoke', () => {
    render(<TrainerInviteListClient invites={[pending]} />);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('renders accepted section with joined date', () => {
    render(<TrainerInviteListClient invites={[accepted]} />);
    expect(screen.getByText('c@d.com')).toBeInTheDocument();
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
  });

  it('renders expired row with Regenerate button', () => {
    render(<TrainerInviteListClient invites={[expired]} />);
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('shows AlertDialog when Revoke clicked (no native confirm)', () => {
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('calls DELETE on trainer endpoint when revoke confirmed', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /revoke invite/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/invites/i1', expect.objectContaining({ method: 'DELETE' }))
    );
  });

  it('calls POST on resend endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=new' }),
    });
    render(<TrainerInviteListClient invites={[pending]} />);
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/invites/i1/resend', expect.objectContaining({ method: 'POST' }))
    );
  });
});
