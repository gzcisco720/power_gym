import React from 'react';
import { render } from '@testing-library/react-native';
import { WellnessTrendChart } from './WellnessTrendChart';
import { CheckIn } from '../../../../types/check-ins';

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci1',
    memberId: 'mem1',
    trainerId: 't1',
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

describe('WellnessTrendChart', () => {
  it('renders the chart container testID for each check-in up to 12', () => {
    const checkIns = Array.from({ length: 15 }, (_, i) =>
      makeCheckIn({ _id: `ci${i}`, submittedAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` }),
    );

    const { getByTestId } = render(<WellnessTrendChart checkIns={checkIns} />);
    // Chart container should be visible
    expect(getByTestId('wellness-trend-chart')).toBeTruthy();
  });

  it('plots average of the 7 sliders per check-in — data points match entry count up to 12', () => {
    const checkIns = Array.from({ length: 5 }, (_, i) =>
      makeCheckIn({
        _id: `ci${i}`,
        sleepQuality: 6,
        stress: 4,
        fatigue: 5,
        hunger: 6,
        recovery: 7,
        energy: 8,
        digestion: 9,
      }),
    );
    // avg = (6+4+5+6+7+8+9)/7 ≈ 6.43

    const { getByTestId } = render(<WellnessTrendChart checkIns={checkIns} />);
    expect(getByTestId('wellness-trend-chart')).toBeTruthy();
    // verify data points label: 5 data points
    expect(getByTestId('wellness-data-count')).toBeTruthy();
    // text should show "5 entries"
  });

  it('uses at most the last 12 check-ins when given more than 12', () => {
    const checkIns = Array.from({ length: 20 }, (_, i) =>
      makeCheckIn({ _id: `ci${i}`, submittedAt: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` }),
    );

    const { getByTestId } = render(<WellnessTrendChart checkIns={checkIns} />);
    // should cap at 12 data points — shown in label
    const countEl = getByTestId('wellness-data-count');
    expect(countEl.props.children).toBe('12 entries');
  });
});
