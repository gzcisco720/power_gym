/**
 * Stage 3 unit tests — PersonalBestsGrid
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Imports ───────────────────────────────────────────────────────────────────

import { PersonalBestsGrid } from './PersonalBestsGrid';
import { PersonalBest } from '../../../../types/training';

function makePR(overrides: Partial<PersonalBest> = {}): PersonalBest {
  return {
    exerciseId: 'ex1',
    exerciseName: 'Bench Press',
    bestWeight: 100,
    bestReps: 5,
    estimatedOneRM: 117,
    achievedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('PersonalBestsGrid', () => {
  it('shows exercise name, "best kg × reps", and "est. 1RM" for each PR', () => {
    const prs: PersonalBest[] = [
      makePR({ exerciseName: 'Bench Press', bestWeight: 100, bestReps: 5, estimatedOneRM: 117 }),
      makePR({ exerciseId: 'ex2', exerciseName: 'Back Squat', bestWeight: 140, bestReps: 3, estimatedOneRM: 153 }),
    ];

    const { getByText, getAllByText } = render(<PersonalBestsGrid personalBests={prs} />);

    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('100 kg × 5')).toBeTruthy();
    expect(getByText('117 kg')).toBeTruthy();

    expect(getByText('Back Squat')).toBeTruthy();
    expect(getByText('140 kg × 3')).toBeTruthy();
    expect(getByText('153 kg')).toBeTruthy();

    // "Est. 1RM" label should appear for each PR
    expect(getAllByText('Est. 1RM').length).toBe(2);
  });

  it('renders empty state when no personal bests provided', () => {
    const { getByTestId } = render(<PersonalBestsGrid personalBests={[]} />);
    expect(getByTestId('personal-bests-empty')).toBeTruthy();
  });

  it('renders a card per PR with testID personal-best-{exerciseId}', () => {
    const prs: PersonalBest[] = [
      makePR({ exerciseId: 'ex1' }),
      makePR({ exerciseId: 'ex2', exerciseName: 'Deadlift' }),
    ];

    const { getByTestId } = render(<PersonalBestsGrid personalBests={prs} />);

    expect(getByTestId('personal-best-ex1')).toBeTruthy();
    expect(getByTestId('personal-best-ex2')).toBeTruthy();
  });
});
