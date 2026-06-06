import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberCheckInsTab } from './MemberCheckInsTab';
import { CheckIn } from '../../../types/check-ins';

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci1',
    memberId: 'mem1',
    trainerId: 'trainer1',
    submittedAt: '2026-06-01T10:00:00.000Z',
    sleepQuality: 7,
    stress: 4,
    fatigue: 5,
    hunger: 6,
    recovery: 7,
    energy: 6,
    digestion: 8,
    weight: null,
    waist: null,
    steps: null,
    exerciseMinutes: null,
    walkRunDistance: null,
    sleepHours: null,
    stuckToDiet: 'yes',
    dietDetails: null,
    wellbeing: null,
    notes: null,
    photos: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('MemberCheckInsTab', () => {
  it('renders a member-checkin-item-{id} row for each check-in in props', () => {
    const checkIns = [
      makeCheckIn({ _id: 'ci1' }),
      makeCheckIn({ _id: 'ci2', submittedAt: '2026-06-02T10:00:00.000Z' }),
    ];
    const { getByTestId } = render(
      <MemberCheckInsTab checkIns={checkIns} onPressCheckIn={jest.fn()} />,
    );

    expect(getByTestId('member-checkin-item-ci1')).toBeTruthy();
    expect(getByTestId('member-checkin-item-ci2')).toBeTruthy();
  });

  it('shows the empty-state text when checkIns is an empty array', () => {
    const { getByText } = render(
      <MemberCheckInsTab checkIns={[]} onPressCheckIn={jest.fn()} />,
    );

    expect(getByText('No check-ins recorded yet.')).toBeTruthy();
  });

  it('calls onPressCheckIn with the tapped check-in object', () => {
    const checkIn = makeCheckIn({ _id: 'ci1' });
    const onPressCheckIn = jest.fn();

    const { getByTestId } = render(
      <MemberCheckInsTab checkIns={[checkIn]} onPressCheckIn={onPressCheckIn} />,
    );

    fireEvent.press(getByTestId('member-checkin-item-ci1'));
    expect(onPressCheckIn).toHaveBeenCalledWith(checkIn);
  });
});
