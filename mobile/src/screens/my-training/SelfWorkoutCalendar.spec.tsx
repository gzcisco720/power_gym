import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SelfWorkoutCalendar } from './SelfWorkoutCalendar';
import { SelfSessionSummary } from '../../types/training';

function makeSession(overrides: Partial<SelfSessionSummary> = {}): SelfSessionSummary {
  return {
    _id: 'sess1',
    dayName: 'Push Day',
    startedAt: '2026-06-01T10:00:00.000Z',
    completedAt: '2026-06-01T11:00:00.000Z',
    setCount: 9,
    rpe: 8,
    ...overrides,
  };
}

describe('SelfWorkoutCalendar', () => {
  it('marks a day as having a session when a session completedAt falls on that day of the displayed month', () => {
    // Session completed on June 1, 2026
    const session = makeSession({ completedAt: '2026-06-01T11:00:00.000Z' });
    // Display June 2026
    const initialMonth = new Date(2026, 5, 1); // month 5 = June (0-indexed)

    const { getByTestId } = render(
      <SelfWorkoutCalendar
        sessions={[session]}
        onSelect={jest.fn()}
        initialMonth={initialMonth}
      />,
    );

    // Day 1 of June should be marked
    expect(getByTestId('calendar-day-marked-1')).toBeTruthy();
  });

  it('advancing the month with the next-month control re-derives marked days for the new month', () => {
    // Session in June, none in July
    const juneSession = makeSession({
      _id: 'sess-june',
      completedAt: '2026-06-15T11:00:00.000Z',
    });
    const initialMonth = new Date(2026, 5, 1); // June 2026

    const { getByTestId, queryByTestId } = render(
      <SelfWorkoutCalendar
        sessions={[juneSession]}
        onSelect={jest.fn()}
        initialMonth={initialMonth}
      />,
    );

    // June has a marked day
    expect(getByTestId('calendar-day-marked-15')).toBeTruthy();

    // Advance to July
    fireEvent.press(getByTestId('calendar-next-month'));

    // July has no marked days — the June session's day (15) should no longer be marked
    expect(queryByTestId('calendar-day-marked-15')).toBeNull();
  });

  it('tapping a marked day invokes onSelect with that day session', () => {
    const session = makeSession({ completedAt: '2026-06-10T11:00:00.000Z' });
    const initialMonth = new Date(2026, 5, 1); // June 2026
    const onSelect = jest.fn();

    const { getByTestId } = render(
      <SelfWorkoutCalendar
        sessions={[session]}
        onSelect={onSelect}
        initialMonth={initialMonth}
      />,
    );

    fireEvent.press(getByTestId('calendar-day-marked-10'));

    expect(onSelect).toHaveBeenCalledWith(session);
  });
});
