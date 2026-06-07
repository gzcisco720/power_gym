import React from 'react';
import { render } from '@testing-library/react-native';
import { DietComplianceHeatmap } from './DietComplianceHeatmap';
import { CheckIn } from '../../../../types/check-ins';

function makeCheckIn(stuckToDiet: CheckIn['stuckToDiet'], id: string): CheckIn {
  return {
    _id: id,
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
    stuckToDiet,
    dietDetails: null,
    wellbeing: null,
    notes: null,
    photos: [],
    createdAt: '2026-06-01T10:00:00.000Z',
  };
}

describe('DietComplianceHeatmap', () => {
  it('renders a square for each check-in up to 16', () => {
    const checkIns = Array.from({ length: 20 }, (_, i) =>
      makeCheckIn('yes', `ci${i}`),
    );
    const { getAllByTestId } = render(<DietComplianceHeatmap checkIns={checkIns} />);
    // Should only render 16 squares
    expect(getAllByTestId(/^heatmap-square-/).length).toBe(16);
  });

  it('maps stuckToDiet yes → emerald color class', () => {
    const checkIns = [makeCheckIn('yes', 'ci1')];
    const { getByTestId } = render(<DietComplianceHeatmap checkIns={checkIns} />);
    const square = getByTestId('heatmap-square-ci1');
    // Check that the square has emerald color prop (NativeWind className)
    expect(square.props.className ?? '').toContain('emerald');
  });

  it('maps stuckToDiet partial → amber color class', () => {
    const checkIns = [makeCheckIn('partial', 'ci2')];
    const { getByTestId } = render(<DietComplianceHeatmap checkIns={checkIns} />);
    const square = getByTestId('heatmap-square-ci2');
    expect(square.props.className ?? '').toContain('amber');
  });

  it('maps stuckToDiet no → rose color class', () => {
    const checkIns = [makeCheckIn('no', 'ci3')];
    const { getByTestId } = render(<DietComplianceHeatmap checkIns={checkIns} />);
    const square = getByTestId('heatmap-square-ci3');
    expect(square.props.className ?? '').toContain('rose');
  });
});
