import { render, screen } from '@testing-library/react';
import { MemberScheduleHero, daysUntil } from '@/app/(dashboard)/member/schedule/_components/member-schedule-hero';
import type { SessionDto } from '@/app/(dashboard)/member/schedule/_components/types';

const TODAY = new Date('2026-05-20T10:00:00');

// Use noon UTC so local date is unambiguous across all reasonable timezones
const makeSession = (overrides: Partial<SessionDto> = {}): SessionDto => ({
  _id: 's1',
  date: '2026-05-22T12:00:00.000Z',
  startTime: '07:30',
  endTime: '08:30',
  trainerName: 'Coach Mike',
  memberCount: 1,
  status: 'scheduled',
  isRecurring: false,
  ...overrides,
});

describe('daysUntil', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterEach(() => jest.useRealTimers());

  it('returns 0 when session is today', () => {
    expect(daysUntil('2026-05-20T12:00:00.000Z')).toBe(0);
  });

  it('returns 2 when session is 2 days away', () => {
    expect(daysUntil('2026-05-22T12:00:00.000Z')).toBe(2);
  });

  it('returns 1 when session is tomorrow', () => {
    expect(daysUntil('2026-05-21T12:00:00.000Z')).toBe(1);
  });
});

describe('MemberScheduleHero', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterEach(() => jest.useRealTimers());

  it('renders EmptyState when session is null', () => {
    render(<MemberScheduleHero session={null} />);
    expect(screen.getByText(/no upcoming sessions/i)).toBeInTheDocument();
  });

  it('renders date, time and trainer for a future session', () => {
    render(<MemberScheduleHero session={makeSession()} />);
    expect(screen.getByText(/Fri, May 22/i)).toBeInTheDocument();
    expect(screen.getByText(/07:30 – 08:30/)).toBeInTheDocument();
    expect(screen.getByText(/Coach Mike/)).toBeInTheDocument();
  });

  it('shows "in N days" badge for a future session', () => {
    render(<MemberScheduleHero session={makeSession()} />);
    expect(screen.getByText('in 2 days')).toBeInTheDocument();
    expect(screen.getByText('Next Session')).toBeInTheDocument();
  });

  it('shows "Today" badge when session is today', () => {
    render(<MemberScheduleHero session={makeSession({ date: '2026-05-20T12:00:00.000Z' })} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText("Today's Session")).toBeInTheDocument();
  });

  it('shows "1-on-1" for memberCount 1', () => {
    render(<MemberScheduleHero session={makeSession({ memberCount: 1 })} />);
    expect(screen.getByText(/1-on-1/)).toBeInTheDocument();
  });

  it('shows "Group (4)" for memberCount 4', () => {
    render(<MemberScheduleHero session={makeSession({ memberCount: 4 })} />);
    expect(screen.getByText(/Group \(4\)/)).toBeInTheDocument();
  });

  it('shows recurring badge when isRecurring is true', () => {
    render(<MemberScheduleHero session={makeSession({ isRecurring: true })} />);
    expect(screen.getByText(/↺ Recurring/)).toBeInTheDocument();
  });

  it('does not show recurring badge when isRecurring is false', () => {
    render(<MemberScheduleHero session={makeSession({ isRecurring: false })} />);
    expect(screen.queryByText(/↺ Recurring/)).not.toBeInTheDocument();
  });
});
