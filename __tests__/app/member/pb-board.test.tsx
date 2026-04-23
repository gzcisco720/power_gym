import { render, screen } from '@testing-library/react';
import { PBBoard } from '@/app/(dashboard)/member/pbs/_components/pb-board';

const mockPBs = [
  { exerciseName: 'Bench Press', bestWeight: 100, bestReps: 8, estimatedOneRM: 126.67, achievedAt: '2026-04-21T10:00:00.000Z' },
  { exerciseName: 'Squat', bestWeight: 140, bestReps: 5, estimatedOneRM: 163.33, achievedAt: '2026-04-20T10:00:00.000Z' },
];

describe('PBBoard', () => {
  it('renders exercise names', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
  });

  it('shows estimated 1RM for each exercise', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('126.7')).toBeInTheDocument();
    expect(screen.getByText('163.3')).toBeInTheDocument();
  });

  it('shows best weight and reps', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('100 kg × 8')).toBeInTheDocument();
    expect(screen.getByText('140 kg × 5')).toBeInTheDocument();
  });

  it('shows empty state when no PBs', () => {
    render(<PBBoard pbs={[]} />);
    expect(screen.getByText(/还没有记录/i)).toBeInTheDocument();
  });
});
