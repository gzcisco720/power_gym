import { render, screen, fireEvent } from '@testing-library/react';
import { MemberScheduleHistory } from '@/app/(dashboard)/member/schedule/_components/member-schedule-history';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const makeSession = (id: string, status: 'scheduled' | 'cancelled' = 'scheduled'): SessionDto => ({
  _id: id,
  date: '2026-05-15T12:00:00.000Z',
  startTime: '07:30',
  endTime: '08:30',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status,
  isRecurring: false,
});

describe('MemberScheduleHistory', () => {
  it('renders nothing when sessions is empty', () => {
    const { container } = render(<MemberScheduleHistory sessions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows toggle button with count', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1'), makeSession('s2')]} />);
    expect(screen.getByText(/Show history \(2\)/)).toBeInTheDocument();
  });

  it('is collapsed by default — sessions not visible', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    expect(screen.queryByText(/May 15/)).not.toBeInTheDocument();
  });

  it('expands when toggle is clicked', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    fireEvent.click(screen.getByText(/Show history \(1\)/));
    expect(screen.getByText(/Fri, May 15/i)).toBeInTheDocument();
  });

  it('collapses again on second click', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} />);
    fireEvent.click(screen.getByText(/Show history \(1\)/));
    fireEvent.click(screen.getByText(/Hide history/));
    expect(screen.queryByText(/May 15/)).not.toBeInTheDocument();
  });

  it('shows "Cancelled" for cancelled sessions when expanded', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1', 'cancelled')]} />);
    fireEvent.click(screen.getByText(/Show history \(1\)/));
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('starts expanded when defaultOpen is true', () => {
    render(<MemberScheduleHistory sessions={[makeSession('s1')]} defaultOpen />);
    expect(screen.getByText(/Fri, May 15/i)).toBeInTheDocument();
  });
});
