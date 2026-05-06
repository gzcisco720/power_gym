import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const dayTypeNames = ['Training', 'Rest'];
const initialSchedule = {
  weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }],
  calendarOverrides: [{ date: '2026-05-04', dayTypeName: 'Rest' }],
};

beforeEach(() => jest.clearAllMocks());

describe('ScheduleEditor', () => {
  it('renders weekly pattern and calendar overrides', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={initialSchedule} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('2026-05-04')).toBeInTheDocument();
  });

  it('saves on Save click', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={initialSchedule} />);
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/members/m1/nutrition/schedule',
      expect.objectContaining({ method: 'PATCH' }),
    ));
  });
});
