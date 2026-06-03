/**
 * Stage 3 unit tests — AgendaSessionCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { AgendaSessionCard } from './AgendaSessionCard';
import { StaffSession } from '../../../types/scheduled-sessions';

function makeSession(overrides: Partial<StaffSession> = {}): StaffSession {
  return {
    _id: 'sess1',
    date: '2026-07-15',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    trainerId: 'trainer1',
    trainerName: 'Jane Smith',
    memberIds: ['m1', 'm2'],
    memberNames: ['Alice', 'Bob'],
    serviceTypeId: null,
    serviceTypeName: null,
    customServiceName: null,
    seriesId: null,
    isRecurring: false,
    ...overrides,
  };
}

describe('AgendaSessionCard', () => {
  it('renders member names comma-joined', () => {
    const session = makeSession({ memberNames: ['Alice', 'Bob'] });
    const { getByText } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Alice, Bob')).toBeTruthy();
  });

  it('renders time range', () => {
    const session = makeSession({ startTime: '09:00', endTime: '10:00' });
    const { getByText } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('09:00 – 10:00')).toBeTruthy();
  });

  it('renders trainer name', () => {
    const session = makeSession({ trainerName: 'Jane Smith' });
    const { getByText } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Jane Smith')).toBeTruthy();
  });

  it('renders serviceTypeName when set', () => {
    const session = makeSession({ serviceTypeName: 'Personal Training' });
    const { getByText } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Personal Training')).toBeTruthy();
  });

  it('renders customServiceName when serviceTypeName is null', () => {
    const session = makeSession({
      serviceTypeName: null,
      customServiceName: 'Yoga Session',
    });
    const { getByText } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Yoga Session')).toBeTruthy();
  });

  it('renders recurring badge when seriesId is set', () => {
    const session = makeSession({ seriesId: 'series-123' });
    const { getByTestId } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByTestId('session-recurring-badge')).toBeTruthy();
  });

  it('does not render recurring badge when seriesId is null', () => {
    const session = makeSession({ seriesId: null });
    const { queryByTestId } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(queryByTestId('session-recurring-badge')).toBeNull();
  });

  it('calls onEdit when card is pressed', () => {
    const onEdit = jest.fn();
    const session = makeSession();
    const { getByTestId } = render(
      <AgendaSessionCard session={session} onEdit={onEdit} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByTestId('session-card-sess1'));
    expect(onEdit).toHaveBeenCalledWith(session);
  });

  it('calls onDelete when delete button is pressed', () => {
    const onDelete = jest.fn();
    const session = makeSession();
    const { getByTestId } = render(
      <AgendaSessionCard session={session} onEdit={jest.fn()} onDelete={onDelete} />,
    );
    fireEvent.press(getByTestId('session-delete-btn-sess1'));
    expect(onDelete).toHaveBeenCalledWith(session);
  });
});
