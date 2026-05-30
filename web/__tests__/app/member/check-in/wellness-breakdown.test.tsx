import { render, screen } from '@testing-library/react';
import { WellnessBreakdown } from '@/app/(dashboard)/member/check-in/_components/wellness-breakdown';
import type { CheckInRecord } from '@/lib/check-in-stats';

const checkIn: CheckInRecord = {
  _id: '1',
  memberId: 'm1',
  trainerId: 't1',
  submittedAt: '2026-05-10T10:00:00.000Z',
  sleepQuality: 8,
  energy: 9,
  recovery: 9,
  stress: 3,
  fatigue: 3,
  hunger: 7,
  digestion: 8,
  weight: 78,
  waist: 83,
  steps: 11000,
  exerciseMinutes: 65,
  walkRunDistance: null,
  sleepHours: 8,
  dietDetails: '',
  stuckToDiet: 'yes',
  wellbeing: '',
  notes: '',
  photos: [],
};

describe('WellnessBreakdown', () => {
  it('renders all 7 field labels', () => {
    render(<WellnessBreakdown checkIn={checkIn} />);
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
    expect(screen.getByText('Digestion')).toBeInTheDocument();
    expect(screen.getByText('Hunger')).toBeInTheDocument();
    expect(screen.getByText('Stress ↓')).toBeInTheDocument();
    expect(screen.getByText('Fatigue ↓')).toBeInTheDocument();
  });

  it('renders numeric values', () => {
    render(<WellnessBreakdown checkIn={checkIn} />);
    // sleep=8 appears
    const eights = screen.getAllByText('8');
    expect(eights.length).toBeGreaterThan(0);
  });

  it('renders header with card title and date', () => {
    render(<WellnessBreakdown checkIn={checkIn} />);
    expect(screen.getByText('Wellness Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Last check-in · /)).toBeInTheDocument();
  });

  it('renders nothing when checkIn is null', () => {
    const { container } = render(<WellnessBreakdown checkIn={null} />);
    expect(container.firstChild).toBeNull();
  });
});
