import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { TrainingHeatmap } from '../TrainingHeatmap';

describe('TrainingHeatmap', () => {
  it('renders exactly 90 cells when variant is 90-day', () => {
    const activeDays = Array(90).fill(false);
    const { getAllByTestId } = render(
      <TrainingHeatmap variant="90-day" activeDays={activeDays} />,
    );
    expect(getAllByTestId('heatmap-cell')).toHaveLength(90);
  });

  it('renders exactly 14 cells when variant is 14-day', () => {
    const activeDays = Array(14).fill(false);
    const { getAllByTestId } = render(
      <TrainingHeatmap variant="14-day" activeDays={activeDays} />,
    );
    expect(getAllByTestId('heatmap-cell')).toHaveLength(14);
  });

  it('today cell carries the ring highlight style', () => {
    // 90-day: last cell (index 89) is today
    const activeDays = Array(90).fill(false);
    const { getAllByTestId } = render(
      <TrainingHeatmap variant="90-day" activeDays={activeDays} />,
    );
    const cells = getAllByTestId('heatmap-cell');
    const todayCell = cells[cells.length - 1];
    // Today cell should have 'ring' or 'border' highlight indicator
    expect(todayCell.props.testID).toBe('heatmap-cell');
    // Check it has a special style marking today — the isToday prop results in a border
    expect(todayCell.props['data-today']).toBe('true');
  });

  it('active days render with filled class', () => {
    const activeDays = Array(14).fill(false);
    activeDays[7] = true; // index 7 is active
    const { getAllByTestId } = render(
      <TrainingHeatmap variant="14-day" activeDays={activeDays} />,
    );
    const cells = getAllByTestId('heatmap-cell');
    expect(cells[7].props['data-active']).toBe('true');
  });
});
