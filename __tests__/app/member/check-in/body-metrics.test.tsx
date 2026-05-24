import { render, screen } from '@testing-library/react';
import { BodyMetrics } from '@/app/(dashboard)/member/check-in/_components/body-metrics';
import type { BodyMetricsResult } from '@/lib/check-in-stats';

const metrics: BodyMetricsResult = {
  weight: { current: 78.0, delta: -1.5, history: [82, 81.5, 80.5, 80, 79.5, 78] },
  waist: { current: 83, delta: -1, history: [87, 86, 85, 84, 83] },
  steps: { current: 11000, delta: 1500, history: [7200, 9500, 8800, 11000] },
  sleepHours: { current: 8.0, delta: 2.0, history: [6.5, 7.0, 7.5, 7.0, 6.0, 8.0] },
  exerciseMinutes: { current: 65, delta: 5, history: [45, 60, 55, 65] },
  stuckToDiet: 'yes',
  dietHistory: ['yes', 'no', 'yes', 'yes', 'yes', 'partial'],
};

describe('BodyMetrics', () => {
  it('renders weight with delta', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText(/▼ 1.5 kg/)).toBeInTheDocument();
  });

  it('renders positive step delta with up arrow', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText(/▲ 1,500/)).toBeInTheDocument();
  });

  it('shows en-dash when no current value', () => {
    render(<BodyMetrics metrics={{ ...metrics, steps: { current: null, delta: null, history: [] } }} />);
    expect(screen.getAllByText('–').length).toBeGreaterThan(0);
  });

  it('renders On track for yes diet', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText('On track')).toBeInTheDocument();
  });
});
