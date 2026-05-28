import { render, screen } from '@testing-library/react';
import { WeekCalendarGrid } from '@/components/calendar/week-calendar-grid';

const baseProps = {
  weekStart: new Date('2026-05-04'), // Monday
  sessions: [],
  memberMap: {},
  trainerColorMap: {},
  onSlotClick: jest.fn(),
  onSessionClick: jest.fn(),
};

describe('WeekCalendarGrid', () => {
  it('renders 7 day column headers', () => {
    render(<WeekCalendarGrid {...baseProps} />);
    expect(screen.getByText(/Mon/)).toBeInTheDocument();
    expect(screen.getByText(/Sun/)).toBeInTheDocument();
  });

  it('renders a session event card when session is provided', () => {
    const session = {
      _id: 's1',
      seriesId: null,
      trainerId: 't1',
      memberIds: ['m1'],
      date: '2026-05-04T00:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled' as const,
      reminderSentAt: null,
    };
    render(
      <WeekCalendarGrid
        {...baseProps}
        sessions={[session]}
        memberMap={{ m1: 'Alice' }}
        trainerColorMap={{ t1: '#3b82f6' }}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
