import { render, screen } from '@testing-library/react';
import { BodyTestViewer } from '@/app/(dashboard)/member/body-tests/_components/body-test-viewer';

// Recharts uses SVG and ResizeObserver — mock them for Jest
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

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
  it('shows "暂无体测记录" when no tests', () => {
    render(<BodyTestViewer tests={[]} />);
    expect(screen.getByText(/暂无体测记录/i)).toBeInTheDocument();
  });

  it('renders test records with body fat percentage', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getAllByText(/20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/22/).length).toBeGreaterThan(0);
  });

  it('renders the Recharts line chart when tests exist', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows target comparison when targets are set', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByText(/目标/i)).toBeInTheDocument();
  });

  it('shows weight and lean/fat mass for each record', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getAllByText(/80/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/64/).length).toBeGreaterThan(0);
  });
});
