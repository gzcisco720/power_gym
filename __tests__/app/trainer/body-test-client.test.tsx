import { render, screen } from '@testing-library/react';
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

describe('BodyTestClient (smoke)', () => {
  it('renders existing records', () => {
    render(<BodyTestClient memberId="m1" initialTests={mockTests} />);
    expect(screen.getAllByText('80').length).toBeGreaterThan(0);
  });

  it('shows empty state when no tests', () => {
    render(<BodyTestClient memberId="m1" initialTests={[]} />);
    expect(screen.getByText(/no body tests yet/i)).toBeInTheDocument();
  });

  it('exposes a New Test trigger', () => {
    render(<BodyTestClient memberId="m1" initialTests={[]} defaultAge={28} />);
    expect(screen.getAllByRole('button', { name: /new test/i }).length).toBeGreaterThanOrEqual(1);
  });
});
