import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    members: [
      { _id: 'm1', name: 'Member One', email: 'm1@gym.com', trainerId: 't1', createdAt: '2026-02-01T00:00:00.000Z' },
    ],
  },
];

describe('TrainerListClient', () => {
  it('renders trainer name and member count', () => {
    render(<TrainerListClient trainers={mockTrainers} allTrainers={mockTrainers} />);
    expect(screen.getByText('Li Wei')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });

  it('shows members list when Members button clicked', () => {
    render(<TrainerListClient trainers={mockTrainers} allTrainers={mockTrainers} />);
    fireEvent.click(screen.getByRole('button', { name: /Members/i }));
    expect(screen.getByText('Member One')).toBeInTheDocument();
  });

  it('calls DELETE API when Remove button clicked and confirmed', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.confirm = jest.fn().mockReturnValue(true);

    render(<TrainerListClient trainers={mockTrainers} allTrainers={mockTrainers} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/trainers/t1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
