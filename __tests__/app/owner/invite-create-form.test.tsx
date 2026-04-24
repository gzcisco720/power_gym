import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteCreateForm } from '@/app/(dashboard)/owner/invites/_components/invite-create-form';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockTrainers = [{ _id: 't1', name: 'Li Wei' }];

describe('InviteCreateForm', () => {
  it('renders role selector and email input', () => {
    render(<InviteCreateForm trainers={mockTrainers} />);
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('shows trainer selector when member role selected', () => {
    render(<InviteCreateForm trainers={mockTrainers} />);
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'member' } });
    expect(screen.getByLabelText(/Assign to Trainer/i)).toBeInTheDocument();
  });

  it('calls POST and shows invite URL on submit', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ inviteUrl: 'http://localhost/register?token=tok' }),
    });
    render(<InviteCreateForm trainers={mockTrainers} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@gym.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect(screen.getByText(/register\?token=tok/)).toBeInTheDocument());
  });
});
