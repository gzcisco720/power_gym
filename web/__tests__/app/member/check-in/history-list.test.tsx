import { render, screen } from '@testing-library/react';
import { HistoryList } from '@/app/(dashboard)/member/check-in/_components/history-list';
import type { CheckInRecord } from '@/lib/check-in-stats';

const checkIns: CheckInRecord[] = [
  {
    _id: '1', memberId: 'm', trainerId: 't',
    submittedAt: '2026-05-10T10:00:00.000Z',
    sleepQuality: 8, energy: 9, recovery: 9, stress: 3, fatigue: 3, hunger: 7, digestion: 8,
    weight: 78, waist: 83, steps: 11000, exerciseMinutes: 65,
    walkRunDistance: null, sleepHours: 8,
    dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '',
    photos: ['a.jpg', 'b.jpg'],
  },
  {
    _id: '2', memberId: 'm', trainerId: 't',
    submittedAt: '2026-05-03T10:00:00.000Z',
    sleepQuality: 6, energy: 6, recovery: 6, stress: 7, fatigue: 7, hunger: 5, digestion: 6,
    weight: 79.5, waist: null, steps: null, exerciseMinutes: null,
    walkRunDistance: null, sleepHours: 6,
    dietDetails: '', stuckToDiet: 'no', wellbeing: '', notes: '',
    photos: ['c.jpg'],
  },
];

describe('HistoryList', () => {
  it('renders dates for each check-in', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('10 May')).toBeInTheDocument();
    expect(screen.getByText('3 May')).toBeInTheDocument();
  });

  it('shows On track pill for yes diet', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('shows Off track pill for no diet', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('Off track')).toBeInTheDocument();
  });

  it('shows photo count when photos present', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('2 📷')).toBeInTheDocument();
  });

  it('shows View all link with total count', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByRole('link', { name: /View all 26/i })).toBeInTheDocument();
  });
});
