import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BodyTestClient } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const memberId = 'm1';

const mockTests = [
  {
    _id: 'bt1',
    date: new Date('2026-04-01').toISOString(),
    protocol: 'other' as const,
    weight: 80,
    bodyFatPct: 20,
    leanMassKg: 64,
    fatMassKg: 16,
    targetWeight: null,
    targetBodyFatPct: null,
  },
];

describe('BodyTestClient', () => {
  it('renders existing body test records', () => {
    render(<BodyTestClient memberId={memberId} initialTests={mockTests} />);
    expect(screen.getByText(/20/)).toBeInTheDocument();
    expect(screen.getByText(/80/)).toBeInTheDocument();
  });

  it('shows "暂无体测记录" when no tests', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    expect(screen.getByText(/暂无体测记录/i)).toBeInTheDocument();
  });

  it('shows new test form with protocol select', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows bodyFatPct input when "other" protocol selected', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'other' } });
    expect(screen.getByLabelText(/体脂率/i)).toBeInTheDocument();
  });

  it('shows 3-site male fields when 3site protocol selected (default male sex)', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3site' } });
    expect(screen.getByLabelText(/胸部/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/腹部/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/大腿/i)).toBeInTheDocument();
  });

  it('submits form and calls fetch on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ _id: 'bt2', bodyFatPct: 20, leanMassKg: 64, fatMassKg: 16, weight: 80, protocol: 'other', date: new Date().toISOString(), targetWeight: null, targetBodyFatPct: null }) });

    render(<BodyTestClient memberId={memberId} initialTests={[]} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/体脂率/i), { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/members/${memberId}/body-tests`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('calls DELETE API when delete button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    render(<BodyTestClient memberId={memberId} initialTests={mockTests} />);
    fireEvent.click(screen.getByRole('button', { name: /删除/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/members/${memberId}/body-tests/bt1`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
