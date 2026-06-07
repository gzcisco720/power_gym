// Mock LineChart (native module) to avoid Animated teardown errors in Jest
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => {
    const { View } = require('react-native');
    return <View testID="mock-line-chart" />;
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberCheckInsTab } from './MemberCheckInsTab';
import { CheckIn } from '../../../types/check-ins';

// Mock check-in-schedule store to prevent real fetch calls
jest.mock('../../../stores/check-in-schedule.store', () => ({
  useCheckInScheduleStore: (selector: (s: {
    schedule: null;
    loading: boolean;
    fetchSchedule: jest.Mock;
    saveSchedule: jest.Mock;
  }) => unknown) =>
    selector({
      schedule: null,
      loading: false,
      fetchSchedule: jest.fn(),
      saveSchedule: jest.fn(),
    }),
}));

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
      <MemberCheckInsTab memberId="mem1" checkIns={checkIns} onPressCheckIn={jest.fn()} />,
    );

    expect(getByTestId('member-checkin-item-ci1')).toBeTruthy();
    expect(getByTestId('member-checkin-item-ci2')).toBeTruthy();
  });

  it('shows the empty-state text when checkIns is an empty array', () => {
    const { getByText } = render(
      <MemberCheckInsTab memberId="mem1" checkIns={[]} onPressCheckIn={jest.fn()} />,
    );

    expect(getByText('No check-ins recorded yet.')).toBeTruthy();
  });

  it('calls onPressCheckIn with the tapped check-in object', () => {
    const checkIn = makeCheckIn({ _id: 'ci1' });
    const onPressCheckIn = jest.fn();

    const { getByTestId } = render(
      <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={onPressCheckIn} />,
    );

    fireEvent.press(getByTestId('member-checkin-item-ci1'));
    expect(onPressCheckIn).toHaveBeenCalledWith(checkIn);
  });

  describe('list row enrichment', () => {
    it('shows weight when non-null', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', weight: 82.5 });
      const { getByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(getByText('82.5 kg')).toBeTruthy();
    });

    it('does not show weight label when weight is null', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', weight: null });
      const { queryByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(queryByText(/kg/)).toBeNull();
    });

    it('shows "On track" diet badge when stuckToDiet is yes', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', stuckToDiet: 'yes' });
      const { getByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(getByText('On track')).toBeTruthy();
    });

    it('shows "Partial" diet badge when stuckToDiet is partial', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', stuckToDiet: 'partial' });
      const { getByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(getByText('Partial')).toBeTruthy();
    });

    it('shows "Off track" diet badge when stuckToDiet is no', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', stuckToDiet: 'no' });
      const { getByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(getByText('Off track')).toBeTruthy();
    });

    it('shows photo count when photos.length > 0', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', photos: ['url1', 'url2', 'url3'] });
      const { getByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(getByText('3 photos')).toBeTruthy();
    });

    it('does not show photo count when photos is empty', () => {
      const checkIn = makeCheckIn({ _id: 'ci1', photos: [] });
      const { queryByText } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      expect(queryByText(/photos/)).toBeNull();
    });

    it('shows the wellness average score in each row', () => {
      // sleepQuality:7 energy:6 recovery:7 stress:4→(10-4)=6 fatigue:5→(10-5)=5 hunger:6 digestion:8
      // avg = (7+6+7+6+5+6+8)/7 = 45/7 ≈ 6.4
      const checkIn = makeCheckIn({
        _id: 'ci1',
        sleepQuality: 7, energy: 6, recovery: 7, stress: 4, fatigue: 5, hunger: 6, digestion: 8,
      });
      const { getByTestId } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={[checkIn]} onPressCheckIn={jest.fn()} />,
      );
      const avgEl = getByTestId('checkin-row-avg-ci1');
      expect(avgEl.props.children).toContain('6.4');
    });
  });

  describe('wellness chart and heatmap visibility', () => {
    it('does not show wellness chart or heatmap when fewer than 2 check-ins', () => {
      const checkIns = [makeCheckIn({ _id: 'ci1' })];
      const { queryByTestId } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={checkIns} onPressCheckIn={jest.fn()} />,
      );
      expect(queryByTestId('wellness-trend-chart')).toBeNull();
      expect(queryByTestId('diet-compliance-heatmap')).toBeNull();
    });

    it('shows wellness chart and heatmap when 2 or more check-ins', () => {
      const checkIns = [
        makeCheckIn({ _id: 'ci1' }),
        makeCheckIn({ _id: 'ci2', submittedAt: '2026-06-02T10:00:00.000Z' }),
      ];
      const { getByTestId } = render(
        <MemberCheckInsTab memberId="mem1" checkIns={checkIns} onPressCheckIn={jest.fn()} />,
      );
      expect(getByTestId('wellness-trend-chart')).toBeTruthy();
      expect(getByTestId('diet-compliance-heatmap')).toBeTruthy();
    });
  });
});
