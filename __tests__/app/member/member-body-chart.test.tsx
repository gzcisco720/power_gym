import { render, screen } from '@testing-library/react';
import { MemberBodyChartClient } from '@/app/(dashboard)/member/_components/member-body-chart-client';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockPoints = [
  { date: '2026-01-15', weight: 78.0, bodyFatPct: 20.5 },
  { date: '2026-02-20', weight: 76.5, bodyFatPct: 19.8 },
  { date: '2026-03-25', weight: 75.3, bodyFatPct: 18.5 },
];

describe('MemberBodyChartClient', () => {
  it('renders the chart when data has 2+ points', () => {
    render(<MemberBodyChartClient points={mockPoints} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty state when fewer than 2 points', () => {
    render(<MemberBodyChartClient points={[mockPoints[0]]} />);
    expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
  });

  it('renders empty state when no points', () => {
    render(<MemberBodyChartClient points={[]} />);
    expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
  });
});
