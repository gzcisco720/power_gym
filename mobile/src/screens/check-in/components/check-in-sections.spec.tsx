/**
 * Stage 4 unit tests — AchievementsSection and CompareCard components
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CheckIn } from '../../../types/check-ins';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci1',
    memberId: 'mem1',
    trainerId: 'tr1',
    submittedAt: '2026-06-06T10:00:00.000Z',
    sleepQuality: 7,
    energy: 6,
    recovery: 8,
    stress: 4,
    fatigue: 5,
    hunger: 6,
    digestion: 7,
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
    createdAt: '2026-06-06T10:00:00.000Z',
    ...overrides,
  };
}

// ── AchievementsSection tests ─────────────────────────────────────────────────

import { AchievementsSection } from './AchievementsSection';

describe('AchievementsSection > renders', () => {
  it('marks a badge achieved when streak >= its threshold and locked otherwise', () => {
    // Streak of 14: badges at 7 and 14 should be achieved; 30/60/100 locked
    const { getByTestId } = render(<AchievementsSection streakWeeks={14} />);

    expect(getByTestId('achievement-badge-7').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('achievement-badge-14').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('achievement-badge-30').props.accessibilityState?.selected).toBe(false);
    expect(getByTestId('achievement-badge-60').props.accessibilityState?.selected).toBe(false);
    expect(getByTestId('achievement-badge-100').props.accessibilityState?.selected).toBe(false);
  });
});

// ── CompareCard tests ─────────────────────────────────────────────────────────

import { CompareCard } from './CompareCard';

describe('CompareCard > renders', () => {
  it('shows two columns with each check-in date and wellness average', () => {
    const ci1 = makeCheckIn({
      _id: 'ci1',
      submittedAt: '2026-06-06T10:00:00.000Z',
      sleepQuality: 8,
      energy: 7,
      recovery: 8,
      stress: 5,
      fatigue: 5,
      hunger: 6,
      digestion: 7,
    });
    const ci2 = makeCheckIn({
      _id: 'ci2',
      submittedAt: '2026-05-30T10:00:00.000Z',
      sleepQuality: 6,
      energy: 5,
      recovery: 6,
      stress: 4,
      fatigue: 4,
      hunger: 5,
      digestion: 6,
    });

    const { getByTestId } = render(<CompareCard current={ci1} previous={ci2} />);

    expect(getByTestId('compare-current-date')).toBeTruthy();
    expect(getByTestId('compare-previous-date')).toBeTruthy();
    expect(getByTestId('compare-current-wellness')).toBeTruthy();
    expect(getByTestId('compare-previous-wellness')).toBeTruthy();
  });
});
