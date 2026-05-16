import { render, screen } from '@testing-library/react';
import { MemberStrengthChartClient } from '@/app/(dashboard)/member/_components/member-strength-chart-client';

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

const mockExercises = [
  {
    exerciseName: 'Squat',
    points: [
      { date: 'Jan 15', oneRM: 120 },
      { date: 'Feb 20', oneRM: 130 },
      { date: 'Mar 25', oneRM: 140 },
    ],
  },
  {
    exerciseName: 'Bench Press',
    points: [
      { date: 'Jan 15', oneRM: 90 },
      { date: 'Feb 20', oneRM: 95 },
      { date: 'Mar 25', oneRM: 100 },
    ],
  },
];

describe('MemberStrengthChartClient', () => {
  it('renders the chart when exercises have points', () => {
    render(<MemberStrengthChartClient exercises={mockExercises} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty state when no exercises', () => {
    render(<MemberStrengthChartClient exercises={[]} />);
    expect(screen.getByText(/complete workouts/i)).toBeInTheDocument();
  });

  it('renders empty state when all exercises have fewer than 2 points', () => {
    const onePoint = [{ exerciseName: 'Squat', points: [{ date: 'Jan 1', oneRM: 100 }] }];
    render(<MemberStrengthChartClient exercises={onePoint} />);
    expect(screen.getByText(/complete workouts/i)).toBeInTheDocument();
  });
});
