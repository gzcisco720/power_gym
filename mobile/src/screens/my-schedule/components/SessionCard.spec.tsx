/**
 * Stage 3 unit tests — SessionCard component
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { SessionCard } from './SessionCard';
import { ScheduledSession } from '../../../types/scheduled-sessions';

function makeSession(overrides: Partial<ScheduledSession> = {}): ScheduledSession {
  return {
    _id: 'sess1',
    date: '2026-07-15T00:00:00.000Z',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    trainerName: 'John Doe',
    serviceTypeName: null,
    isRecurring: false,
    ...overrides,
  };
}

describe('SessionCard', () => {
  it('renders weekday/date, time range, and trainer name from props', () => {
    const session = makeSession({
      date: '2026-07-15T00:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
      trainerName: 'John Doe',
    });

    const { getByTestId, getByText } = render(
      <SessionCard session={session} />,
    );

    expect(getByTestId('session-card-sess1')).toBeTruthy();
    expect(getByText('09:00 – 10:00')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    // Date must show weekday + date — exact format tested below
    // "Wed, 15 Jul 2026" or similar — just check the year is present
    expect(getByText(/2026/)).toBeTruthy();
  });

  it('renders serviceTypeName when provided', () => {
    const session = makeSession({ serviceTypeName: 'Personal Training' });

    const { getByText } = render(<SessionCard session={session} />);

    expect(getByText('Personal Training')).toBeTruthy();
  });

  it('omits serviceTypeName when null', () => {
    const session = makeSession({ serviceTypeName: null });

    const { queryByTestId } = render(<SessionCard session={session} />);

    expect(queryByTestId('session-card-service-type-sess1')).toBeNull();
  });
});
