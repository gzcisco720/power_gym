import { render, screen, fireEvent } from '@testing-library/react';
import { MemberScheduleTimeline } from '@/app/(dashboard)/member/schedule/_components/member-schedule-timeline';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const TODAY = new Date('2026-05-20T10:00:00');

const makeSession = (id: string, daysFromNow: number): SessionDto => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(12, 0, 0, 0);
  return {
    _id: id,
    date: d.toISOString(),
    startTime: '09:00',
    endTime: '10:00',
    trainerName: 'Coach Mike',
    memberCount: 1,
    status: 'scheduled',
    isRecurring: false,
  };
};

describe('MemberScheduleTimeline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterEach(() => jest.useRealTimers());

  it('renders nothing when sessions is empty', () => {
    const { container } = render(
      <MemberScheduleTimeline sessions={[]} heroIsToday={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "Upcoming" when heroIsToday is false', () => {
    render(
      <MemberScheduleTimeline sessions={[makeSession('s1', 3)]} heroIsToday={false} />,
    );
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows "Coming Up" when heroIsToday is true', () => {
    render(
      <MemberScheduleTimeline sessions={[makeSession('s1', 3)]} heroIsToday={true} />,
    );
    expect(screen.getByText('Coming Up')).toBeInTheDocument();
  });

  it('renders sessions within 14 days', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', 5), makeSession('s2', 10)]}
        heroIsToday={false}
      />,
    );
    expect(screen.getAllByText(/Coach Mike/).length).toBe(2);
    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
  });

  it('hides sessions beyond 14 days behind Load More', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', 5), makeSession('s2', 20)]}
        heroIsToday={false}
      />,
    );
    expect(screen.getAllByText(/Coach Mike/).length).toBe(1);
    expect(screen.getByText(/Load more \(1 more\)/)).toBeInTheDocument();
  });

  it('reveals all sessions after clicking Load More', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', 5), makeSession('s2', 20), makeSession('s3', 30)]}
        heroIsToday={false}
      />,
    );
    expect(screen.getAllByText(/Coach Mike/).length).toBe(1);
    fireEvent.click(screen.getByText(/Load more \(2 more\)/));
    expect(screen.getAllByText(/Coach Mike/).length).toBe(3);
    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
  });
});
