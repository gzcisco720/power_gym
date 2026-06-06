/**
 * Stage 4 unit tests — wellness helpers
 */

import { CheckIn } from '../../types/check-ins';
import {
  computeCheckInStreakWeeks,
  wellnessBreakdown,
  latestWithBodyMetrics,
  latestPhotos,
} from './wellness';

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

/** ISO date for N weeks before 2026-06-06 */
function weeksAgo(n: number): string {
  const d = new Date('2026-06-06T10:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - n * 7);
  return d.toISOString();
}

// ── computeCheckInStreakWeeks ─────────────────────────────────────────────────

describe('wellness > computeCheckInStreakWeeks', () => {
  it('returns 0 when there are no check-ins', () => {
    expect(computeCheckInStreakWeeks([])).toBe(0);
  });

  it('returns consecutive-week count from most recent, breaking on a gap', () => {
    const items = [
      makeCheckIn({ _id: 'c1', submittedAt: weeksAgo(0) }),
      makeCheckIn({ _id: 'c2', submittedAt: weeksAgo(1) }),
      makeCheckIn({ _id: 'c3', submittedAt: weeksAgo(2) }),
      // gap of 2 weeks
      makeCheckIn({ _id: 'c4', submittedAt: weeksAgo(4) }),
    ];
    expect(computeCheckInStreakWeeks(items)).toBe(3);
  });

  it('returns 1 when only the most recent week has a check-in', () => {
    const items = [makeCheckIn({ _id: 'c1', submittedAt: weeksAgo(0) })];
    expect(computeCheckInStreakWeeks(items)).toBe(1);
  });
});

// ── wellnessBreakdown ─────────────────────────────────────────────────────────

describe('wellness > wellnessBreakdown', () => {
  it('returns 7 entries with the slider label and value for the given check-in', () => {
    const checkIn = makeCheckIn({
      sleepQuality: 8,
      energy: 7,
      recovery: 6,
      stress: 5,
      fatigue: 4,
      hunger: 3,
      digestion: 9,
    });

    const result = wellnessBreakdown(checkIn);
    expect(result).toHaveLength(7);

    const sleepEntry = result.find((e) => e.label === 'Sleep Quality');
    expect(sleepEntry).toBeDefined();
    expect(sleepEntry?.value).toBe(8);

    const digestEntry = result.find((e) => e.label === 'Digestion');
    expect(digestEntry?.value).toBe(9);
  });
});

// ── latestWithBodyMetrics ─────────────────────────────────────────────────────

describe('wellness > latestWithBodyMetrics', () => {
  it('returns null when none of the check-ins have any non-null body metric', () => {
    const items = [makeCheckIn(), makeCheckIn({ _id: 'c2' })];
    expect(latestWithBodyMetrics(items)).toBeNull();
  });

  it('returns the most recent check-in having any non-null body metric', () => {
    const older = makeCheckIn({ _id: 'c1', submittedAt: weeksAgo(2), weight: 80 });
    const newer = makeCheckIn({ _id: 'c2', submittedAt: weeksAgo(1), weight: 79 });
    const noMetrics = makeCheckIn({ _id: 'c3', submittedAt: weeksAgo(0) });

    // items are newest-first (as stored in the check-ins store)
    const items = [noMetrics, newer, older];
    expect(latestWithBodyMetrics(items)?._id).toBe('c2');
  });
});

// ── latestPhotos ──────────────────────────────────────────────────────────────

describe('wellness > latestPhotos', () => {
  it('returns up to max most recent photos flattened from the check-ins', () => {
    const items = [
      makeCheckIn({ _id: 'c1', submittedAt: weeksAgo(0), photos: ['url1', 'url2', 'url3'] }),
      makeCheckIn({ _id: 'c2', submittedAt: weeksAgo(1), photos: ['url4', 'url5'] }),
      makeCheckIn({ _id: 'c3', submittedAt: weeksAgo(2), photos: ['url6', 'url7'] }),
    ];
    const result = latestPhotos(items, 6);
    expect(result).toHaveLength(6);
    expect(result[0]).toBe('url1');
    expect(result[5]).toBe('url6');
  });

  it('returns all photos when fewer than max exist', () => {
    const items = [makeCheckIn({ photos: ['a', 'b'] })];
    expect(latestPhotos(items, 6)).toEqual(['a', 'b']);
  });
});
