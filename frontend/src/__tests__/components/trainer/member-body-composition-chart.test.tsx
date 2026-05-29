import { render, screen } from '@testing-library/react';
import type { BodyTest } from '@/api/body-tests';

// Mock recharts to avoid canvas/SVG complexities in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-count={data.length}>{children}</div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`chart-line-${dataKey}`} aria-label={name} />
  ),
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => (
    <div data-testid="chart-legend" />
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

import { MemberBodyCompositionChart } from '@/components/trainer/member-body-composition-chart';

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
    _id: 'bt-1',
    memberId: 'member-1',
    protocol: '3-site',
    weight: 80,
    chest: null,
    abdominal: null,
    thigh: null,
    bodyFatPct: 18.5,
    leanMassKg: 65.2,
    fatMassKg: 14.8,
    date: new Date('2026-05-28').toISOString(),
    ...overrides,
  };
}

describe('MemberBodyCompositionChart', () => {
  describe('with tests', () => {
    it('renders chart with one point per body test', () => {
      const tests = [
        makeBodyTest({ _id: 'bt-1', date: new Date('2026-04-01').toISOString(), weight: 78, bodyFatPct: 17.0 }),
        makeBodyTest({ _id: 'bt-2', date: new Date('2026-05-01').toISOString(), weight: 79, bodyFatPct: 17.5 }),
        makeBodyTest({ _id: 'bt-3', date: new Date('2026-05-28').toISOString(), weight: 80, bodyFatPct: 18.5 }),
      ];

      render(<MemberBodyCompositionChart bodyTests={tests} />);

      // Chart should be rendered with 3 data points
      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-count', '3');

      // Both weight and bodyFatPct lines should be present
      expect(screen.getByTestId('chart-line-weight')).toBeInTheDocument();
      expect(screen.getByTestId('chart-line-bodyFatPct')).toBeInTheDocument();
    });
  });

  describe('empty', () => {
    it('renders an empty state when there are fewer than 2 body tests', () => {
      render(<MemberBodyCompositionChart bodyTests={[makeBodyTest()]} />);
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
      expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
    });

    it('renders an empty state when bodyTests is empty', () => {
      render(<MemberBodyCompositionChart bodyTests={[]} />);
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
      expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
    });
  });
});
