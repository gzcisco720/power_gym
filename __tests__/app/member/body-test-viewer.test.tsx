import React from 'react';
import { render, screen } from '@testing-library/react';
import { BodyTestViewer } from '@/app/(dashboard)/member/body-tests/_components/body-test-viewer';

// Recharts uses SVG and ResizeObserver — mock them for Jest
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

const mockTests = [
  {
    _id: 'bt1',
    date: new Date('2026-04-01').toISOString(),
    protocol: 'other' as const,
    weight: 80,
    bodyFatPct: 20,
    leanMassKg: 64,
    fatMassKg: 16,
    targetWeight: 75,
    targetBodyFatPct: 15,
  },
  {
    _id: 'bt2',
    date: new Date('2026-03-01').toISOString(),
    protocol: 'other' as const,
    weight: 82,
    bodyFatPct: 22,
    leanMassKg: 63.96,
    fatMassKg: 18.04,
    targetWeight: null,
    targetBodyFatPct: null,
  },
];

describe('BodyTestViewer', () => {
  it('shows empty state when no tests', () => {
    render(<BodyTestViewer tests={[]} />);
    expect(screen.getByText('No body tests yet')).toBeInTheDocument();
  });

  it('renders test records with body fat percentage', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getAllByText(/20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/22/).length).toBeGreaterThan(0);
  });

  it('renders the history chart when multiple tests exist', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not show history chart when only one test', () => {
    render(<BodyTestViewer tests={[mockTests[0]]} />);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('shows goal section when targets are set', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByText('Goal')).toBeInTheDocument();
  });

  it('shows latest stats in stat cards', () => {
    render(<BodyTestViewer tests={mockTests} />);
    // Latest is bt1 (Apr 1 > Mar 1) — weight 80, body fat 20
    expect(screen.getAllByText(/80/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/64/).length).toBeGreaterThan(0);
  });
});
