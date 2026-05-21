import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const schedule = {
  weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }],
  calendarOverrides: [],
  iterate: true,
};

beforeEach(() => jest.clearAllMocks());

describe('ScheduleEditor — create mode', () => {
  it('calls onSave with built schedule, does NOT call fetch', async () => {
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        dayTypeNames={['Training', 'Rest']}
        initialSchedule={schedule}
        mode="create"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockFetch).not.toHaveBeenCalled();
    const passedSchedule = onSave.mock.calls[0][0] as typeof schedule;
    expect(passedSchedule.weeklyPattern).toEqual([{ dayOfWeek: 1, dayTypeName: 'Training' }]);
    expect(passedSchedule.iterate).toBe(true);
  });

  it('edit mode still calls fetch and passes schedule to onSave', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        memberId="m1"
        dayTypeNames={['Training']}
        initialSchedule={schedule}
        mode="edit"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const passedSchedule = onSave.mock.calls[0][0];
    expect(passedSchedule).toHaveProperty('weeklyPattern');
  });
});
