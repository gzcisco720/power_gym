import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const dayTypeNames = ['Training', 'Rest'];

const weeklySchedule = {
  weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }],
  calendarOverrides: [{ date: '2026-05-04', dayTypeName: 'Rest' }],
  iterate: true,
};

const emptySchedule = {
  weeklyPattern: [],
  calendarOverrides: [{ date: '2026-05-10', dayTypeName: 'Training' }],
  iterate: false,
};

beforeEach(() => jest.clearAllMocks());

describe('ScheduleEditor', () => {
  it('renders day-of-week selects', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders with empty weekly pattern without crashing', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={emptySchedule} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('shows calendar override date', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    expect(screen.getByText('2026-05-04')).toBeInTheDocument();
  });

  it('calls onSave callback after successful save', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        memberId="m1"
        dayTypeNames={dayTypeNames}
        initialSchedule={weeklySchedule}
        mode="edit"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [passedSchedule] = onSave.mock.calls[0] as [{ weeklyPattern: unknown[] }];
    expect(passedSchedule).toHaveProperty('weeklyPattern');
  });

  it('renders iterate checkbox checked when iterate=true', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    const checkbox = screen.getByRole('checkbox', { name: /iterate weekly/i });
    expect(checkbox).toBeChecked();
  });

  it('toggles iterate checkbox', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    const checkbox = screen.getByRole('checkbox', { name: /iterate weekly/i });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('saves with iterate field included in PATCH body', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      weeklyPattern: unknown;
      calendarOverrides: unknown;
      iterate: boolean;
    };
    expect(body).toHaveProperty('iterate', true);
    expect(body).toHaveProperty('weeklyPattern');
    expect(body).toHaveProperty('calendarOverrides');
  });

  it('sends iterate=false after unchecking the iterate checkbox', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /iterate weekly/i }));
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { iterate: boolean };
    expect(body.iterate).toBe(false);
  });

  it('sends empty weeklyPattern when no days are configured', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={emptySchedule} />);
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { weeklyPattern: unknown[] };
    expect(body.weeklyPattern).toHaveLength(0);
  });

  it('patches the correct member URL', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m42" dayTypeNames={dayTypeNames} initialSchedule={weeklySchedule} />);
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/members/m42/nutrition/schedule',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
