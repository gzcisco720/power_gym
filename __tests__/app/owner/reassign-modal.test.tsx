import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockTrainers = [
  { _id: 't1', name: 'Li Wei' },
  { _id: 't2', name: 'Zhang Yang' },
];

describe('ReassignModal', () => {
  const onClose = jest.fn();

  it('renders member name and trainer select', () => {
    render(
      <ReassignModal
        memberId="m1"
        memberName="Ma Zhe"
        currentTrainerId="t1"
        trainers={mockTrainers}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/Ma Zhe/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls PATCH API and closes on confirm', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(
      <ReassignModal
        memberId="m1"
        memberName="Ma Zhe"
        currentTrainerId="t1"
        trainers={mockTrainers}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't2' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/members/m1/trainer',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

  it('calls onClose when Cancel clicked', () => {
    render(
      <ReassignModal
        memberId="m1"
        memberName="Ma Zhe"
        currentTrainerId="t1"
        trainers={mockTrainers}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
