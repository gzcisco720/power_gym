import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Recharts requires ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock recharts entirely to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

import { CheckInTrends } from './check-ins-tab';
import type { CheckInRecord } from '@/api/member-hub';

function makeCheckIn(id: string, weeksAgo: number): CheckInRecord {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return {
    _id: id,
    submittedAt: d.toISOString(),
    sleepQuality: 7,
    stress: 4,
    fatigue: 4,
    hunger: 6,
    recovery: 7,
    energy: 7,
    digestion: 7,
    weight: 80,
    stuckToDiet: 'yes',
    photos: [],
  };
}

describe('CheckInTrends', () => {
  it('renders a series from check-in data', () => {
    const checkIns: CheckInRecord[] = [
      makeCheckIn('ci1', 1),
      makeCheckIn('ci2', 2),
      makeCheckIn('ci3', 3),
    ];

    render(<CheckInTrends checkIns={checkIns} />);

    // The wellness score chart and diet compliance sections should render
    expect(screen.getByText(/avg wellness score/i)).toBeInTheDocument();
    expect(screen.getByText(/diet compliance/i)).toBeInTheDocument();
    // The line chart should be rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
