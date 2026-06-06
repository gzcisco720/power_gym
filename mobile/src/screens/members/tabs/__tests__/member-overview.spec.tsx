/**
 * Stage 5 unit tests — Member Detail Overview hub (Gap 2)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MemberOverviewStats } from '../../../../types/members';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<MemberOverviewStats> = {}): MemberOverviewStats {
  return {
    sessionsThisMonth: 8,
    weight: { value: 75.5, deltaKg: -1.5 },
    bodyFat: { pct: 18.2, deltaPct: -0.8 },
    topPR: { exerciseName: 'Bench Press', estimatedOneRM: 120 },
    activePlan: { name: 'Strength Plan', dayCount: 4 },
    activeInjuryCount: 1,
    activeMedicationCount: 2,
    weightTrend: [
      { date: '2026-03-01', weight: 78.0 },
      { date: '2026-04-01', weight: 77.0 },
      { date: '2026-05-01', weight: 76.0 },
      { date: '2026-06-01', weight: 75.5 },
    ],
    heatmap: [
      { date: '2026-06-01', count: 1 },
      { date: '2026-06-03', count: 2 },
    ],
    ...overrides,
  };
}

// ── MemberOverviewTab tests ────────────────────────────────────────────────────

import { MemberOverviewTab } from '../MemberOverviewTab';

describe('MemberOverviewTab > renders', () => {
  it('displays sessionsThisMonth, weight+delta, bodyFat+delta, and top PR in the KPI strip', () => {
    const stats = makeStats();
    const { getByTestId } = render(
      <MemberOverviewTab overviewStats={stats} onNavigateToTab={jest.fn()} />,
    );

    expect(getByTestId('kpi-sessions').props.children).toBe(8);
    expect(getByTestId('kpi-weight-value')).toBeTruthy();
    expect(getByTestId('kpi-weight-delta')).toBeTruthy();
    expect(getByTestId('kpi-bodyfat-value')).toBeTruthy();
    expect(getByTestId('kpi-bodyfat-delta')).toBeTruthy();
    expect(getByTestId('kpi-top-pr-name')).toBeTruthy();
    expect(getByTestId('kpi-top-pr-value')).toBeTruthy();
  });

  it('shows "No plan assigned" when activePlan is null', () => {
    const stats = makeStats({ activePlan: null });
    const { getByTestId } = render(
      <MemberOverviewTab overviewStats={stats} onNavigateToTab={jest.fn()} />,
    );

    expect(getByTestId('active-plan-empty')).toBeTruthy();
  });

  it('shows active injury and medication counts in the health panel', () => {
    const stats = makeStats({ activeInjuryCount: 3, activeMedicationCount: 1 });
    const { getByTestId } = render(
      <MemberOverviewTab overviewStats={stats} onNavigateToTab={jest.fn()} />,
    );

    expect(getByTestId('health-injury-count').props.children).toBe(3);
    expect(getByTestId('health-medication-count').props.children).toBe(1);
  });
});

// ── TrainingHeatmap tests ──────────────────────────────────────────────────────

import { TrainingHeatmap } from '../../../members/components/TrainingHeatmap';

describe('TrainingHeatmap > renders', () => {
  it('assigns a higher-intensity class to days with more sessions than days with fewer', () => {
    const heatmap = [
      { date: '2026-06-01', count: 1 },
      { date: '2026-06-02', count: 3 },
    ];
    const { getByTestId } = render(<TrainingHeatmap heatmap={heatmap} />);

    const lowCell = getByTestId('heatmap-cell-2026-06-01');
    const highCell = getByTestId('heatmap-cell-2026-06-02');

    // The intensity prop (or accessibilityValue) should indicate higher for count=3
    expect(highCell.props.accessibilityValue?.text).toBe('3');
    expect(lowCell.props.accessibilityValue?.text).toBe('1');
  });
});
