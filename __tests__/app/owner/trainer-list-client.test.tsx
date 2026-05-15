import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { TrainerListClient } from '@/app/(dashboard)/owner/trainers/_components/trainer-list-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockTrainers = [
  {
    _id: 't1',
    name: 'Li Wei',
    email: 'liwei@gym.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    memberCount: 5,
    sessionsThisMonth: 20,
  },
];

const defaultProps = {
  trainers: mockTrainers,
  allTrainers: mockTrainers,
  totalSessionsThisMonth: 20,
  avgMembersPerTrainer: 5,
};

describe('TrainerListClient', () => {
  it('renders trainer name and stats', () => {
    render(<TrainerListClient {...defaultProps} />);
    expect(screen.getByText('Li Wei')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getByText('members')).toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThan(0);
    expect(screen.getByText('sessions')).toBeInTheDocument();
  });

  it('renders KPI strip with totals', () => {
    render(<TrainerListClient {...defaultProps} />);
    expect(screen.getByText('Total Trainers')).toBeInTheDocument();
    expect(screen.getByText('Sessions / Mo')).toBeInTheDocument();
    expect(screen.getByText('Avg Members / Trainer')).toBeInTheDocument();
  });

  it('renders View Hub link', () => {
    render(<TrainerListClient {...defaultProps} />);
    const link = screen.getByRole('link', { name: /view hub/i });
    expect(link).toHaveAttribute('href', '/owner/trainers/t1');
  });

  it('shows remove confirmation dialog when Remove clicked', () => {
    render(<TrainerListClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('heading', { name: /Remove Trainer/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/Li Wei/)).toBeInTheDocument();
  });

  it('calls DELETE API when dialog confirmed', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<TrainerListClient {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

    const confirmBtn = screen.getByRole('button', { name: /Remove Trainer/i });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/trainers/t1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('shows empty state when no trainers', () => {
    render(<TrainerListClient {...defaultProps} trainers={[]} allTrainers={[]} />);
    expect(screen.getByText(/no trainers yet/i)).toBeInTheDocument();
  });
});
