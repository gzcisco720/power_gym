import { render, screen } from '@testing-library/react';
import { MemberScheduleTimeline } from '@/app/(dashboard)/member/schedule/_components/member-schedule-timeline';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const makeSession = (id: string, date: string): SessionDto => ({
  _id: id,
  date,
  startTime: '09:00',
  endTime: '10:00',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status: 'scheduled',
  isRecurring: false,
});

describe('MemberScheduleTimeline', () => {
  it('renders nothing when sessions is empty', () => {
    const { container } = render(
      <MemberScheduleTimeline sessions={[]} heroIsToday={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "Upcoming" when heroIsToday is false', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', '2026-05-24T12:00:00.000Z')]}
        heroIsToday={false}
      />,
    );
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows "Coming Up" when heroIsToday is true', () => {
    render(
      <MemberScheduleTimeline
        sessions={[makeSession('s1', '2026-05-24T12:00:00.000Z')]}
        heroIsToday={true}
      />,
    );
    expect(screen.getByText('Coming Up')).toBeInTheDocument();
  });

  it('renders each session date and time', () => {
    render(
      <MemberScheduleTimeline
        sessions={[
          makeSession('s1', '2026-05-24T12:00:00.000Z'),
          makeSession('s2', '2026-05-29T12:00:00.000Z'),
        ]}
        heroIsToday={false}
      />,
    );
    expect(screen.getByText(/Sun, May 24/i)).toBeInTheDocument();
    expect(screen.getByText(/Fri, May 29/i)).toBeInTheDocument();
  });
});
