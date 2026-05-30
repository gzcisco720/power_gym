import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// recharts uses ResizeObserver and SVG; mock ResponsiveContainer to render children directly
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
}));

import { MemberGrowthChart } from './member-growth-chart';

const monthData = [
  { label: 'Dec', newCount: 0 },
  { label: 'Jan', newCount: 1 },
  { label: 'Feb', newCount: 2 },
  { label: 'Mar', newCount: 0 },
  { label: 'Apr', newCount: 3 },
  { label: 'May', newCount: 1 },
];

describe('MemberGrowthChart', () => {
  it('renders a data point per month bucket returned', () => {
    render(<MemberGrowthChart data={monthData} />);

    // The chart container should be present
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('shows empty state when all counts are zero', () => {
    const emptyData = monthData.map((d) => ({ ...d, newCount: 0 }));
    render(<MemberGrowthChart data={emptyData} />);

    expect(screen.getByText(/No member data yet/i)).toBeInTheDocument();
  });
});
