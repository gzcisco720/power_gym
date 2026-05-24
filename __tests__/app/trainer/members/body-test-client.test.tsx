import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BodyTestClient } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  useReducedMotion: () => false,
}));
jest.mock(
  '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/new-body-test-dialog',
  () => ({ NewBodyTestDialog: () => <button>New Test</button> }),
);

global.fetch = jest.fn();

const makeTest = (overrides = {}) => ({
  _id: 'bt1',
  date: '2025-05-06T00:00:00.000Z',
  protocol: 'other' as const,
  weight: 78.5,
  bodyFatPct: 14.2,
  leanMassKg: 67.3,
  fatMassKg: 11.2,
  targetWeight: null,
  targetBodyFatPct: null,
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('BodyTestClient', () => {
  it('shows empty state when no tests', () => {
    render(<BodyTestClient memberId="m1" initialTests={[]} />);
    expect(screen.getByText(/no body tests yet/i)).toBeInTheDocument();
  });

  it('shows New Test button in header and empty state', () => {
    render(<BodyTestClient memberId="m1" initialTests={[]} />);
    expect(screen.getAllByRole('button', { name: /new test/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders summary strip with latest weight and body fat', () => {
    render(<BodyTestClient memberId="m1" initialTests={[makeTest()]} />);
    expect(screen.getAllByText('78.5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('14.2').length).toBeGreaterThan(0);
  });

  it('shows BF Change in summary strip when 2+ tests exist', () => {
    const tests = [
      makeTest({ _id: 'bt1', date: '2025-05-06T00:00:00.000Z', bodyFatPct: 14.2 }),
      makeTest({ _id: 'bt2', date: '2025-04-01T00:00:00.000Z', bodyFatPct: 15.8 }),
    ];
    render(<BodyTestClient memberId="m1" initialTests={tests} />);
    expect(screen.getByText('-1.6')).toBeInTheDocument();
  });

  it('renders a card for each test with protocol label', () => {
    render(<BodyTestClient memberId="m1" initialTests={[makeTest({ protocol: '7site' })]} />);
    expect(screen.getByText(/7-site/i)).toBeInTheDocument();
  });

  it('shows Delete button on each card', () => {
    render(<BodyTestClient memberId="m1" initialTests={[makeTest()]} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens delete confirmation dialog on Delete click', () => {
    render(<BodyTestClient memberId="m1" initialTests={[makeTest()]} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('calls DELETE API on confirm', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(<BodyTestClient memberId="m1" initialTests={[makeTest()]} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/members/m1/body-tests/bt1', { method: 'DELETE' });
    });
  });

  it('removes card from list after successful delete', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(<BodyTestClient memberId="m1" initialTests={[makeTest()]} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });
});
