import {
  avgWellnessScore,
  computeAchievements,
  computeBodyMetrics,
  computeHeatmap,
  getWeekStart,
} from '@/lib/check-in-stats';
import type { CheckInRecord } from '@/lib/check-in-stats';

const base: CheckInRecord = {
  _id: '1',
  memberId: 'm1',
  trainerId: 't1',
  submittedAt: new Date('2026-05-10T10:00:00Z').toISOString(),
  sleepQuality: 8, energy: 9, recovery: 9,
  stress: 3, fatigue: 3, hunger: 7, digestion: 8,
  weight: 78.0, waist: 83, steps: 11000,
  exerciseMinutes: 65, walkRunDistance: null, sleepHours: 8.0,
  dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '', photos: [],
};

const older: CheckInRecord = {
  ...base, _id: '2',
  submittedAt: new Date('2026-05-03T10:00:00Z').toISOString(),
  weight: 79.5, waist: null, steps: null, stuckToDiet: 'no',
};

const oldest: CheckInRecord = {
  ...base, _id: '3',
  submittedAt: new Date('2026-04-05T10:00:00Z').toISOString(),
  weight: 87.0, waist: 87, stuckToDiet: 'yes',
};

// sorted newest first (as findByMember returns)
const checkIns = [base, older, oldest];

describe('getWeekStart', () => {
  it('returns Sunday of the week for a mid-week date', () => {
    // 2026-05-13 (Wednesday) → 2026-05-10 (Sunday)
    const d = getWeekStart(new Date('2026-05-13T14:00:00Z'));
    expect(d.getUTCDay()).toBe(0); // Sunday
    expect(d.toISOString().startsWith('2026-05-10')).toBe(true);
  });

  it('returns same day when input is already Sunday midnight UTC', () => {
    const d = getWeekStart(new Date('2026-05-10T00:00:00Z'));
    expect(d.toISOString().startsWith('2026-05-10')).toBe(true);
  });
});

describe('avgWellnessScore', () => {
  it('averages all 7 fields with stress and fatigue inverted', () => {
    // base: sleep=8, energy=9, recovery=9, stress=3(→7), fatigue=3(→7), hunger=7, digestion=8
    // sum = 8+9+9+7+7+7+8 = 55, avg = 55/7 ≈ 7.857 → 7.9
    expect(avgWellnessScore(base)).toBe(7.9);
  });
});

describe('computeAchievements', () => {
  const now = new Date('2026-05-17T10:00:00Z');

  it('computes weight lost from oldest to newest non-null', () => {
    const r = computeAchievements(checkIns, now);
    expect(r.weightLost).toBe(9.0); // 87 - 78
    expect(r.weightFirst).toBe(87.0);
    expect(r.weightLatest).toBe(78.0);
  });

  it('returns null weightLost when no weight data', () => {
    const r = computeAchievements([{ ...base, weight: null }], now);
    expect(r.weightLost).toBeNull();
  });

  it('returns null weightLost when weight increased', () => {
    const gained = [base, { ...oldest, weight: 70.0 }]; // gained weight
    const r = computeAchievements(gained, now);
    expect(r.weightLost).toBeNull();
  });

  it('counts diet streak from most recent consecutive yes', () => {
    // base=yes, older=no → streak=1
    const r = computeAchievements(checkIns, now);
    expect(r.dietStreak).toBe(1);
  });

  it('diet streak = 0 when most recent is not yes', () => {
    const r = computeAchievements([older, oldest], now);
    expect(r.dietStreak).toBe(0);
  });

  it('counts consecutive week streak', () => {
    // base=May10(W19), older=May3(W18), oldest=Apr5(W14 — gap)
    // current week from now(May17) = May17, no check-in so look back to May10
    // May10 ✓, May3 ✓, Apr26 ✗ → streak=2
    const r = computeAchievements(checkIns, now);
    expect(r.currentStreak).toBe(2);
  });
});

describe('computeBodyMetrics', () => {
  it('returns current value and delta for weight', () => {
    const r = computeBodyMetrics(checkIns);
    expect(r.weight.current).toBe(78.0);
    expect(r.weight.delta).toBe(-9.0); // 78 - 87
  });

  it('skips nulls when computing delta', () => {
    // waist: base=83, older=null, oldest=87 → delta = 83-87 = -4
    const r = computeBodyMetrics(checkIns);
    expect(r.waist.current).toBe(83);
    expect(r.waist.delta).toBe(-4);
  });

  it('returns null delta when only one non-null entry', () => {
    const r = computeBodyMetrics([base]);
    expect(r.weight.delta).toBeNull();
  });

  it('returns last 6 diet entries newest-first', () => {
    const r = computeBodyMetrics(checkIns);
    expect(r.dietHistory).toEqual(['yes', 'no', 'yes']);
  });
});

describe('computeHeatmap', () => {
  const now = new Date('2026-05-17T10:00:00Z');

  it('returns 30 cells', () => {
    const cells = computeHeatmap(checkIns, now);
    expect(cells).toHaveLength(30);
  });

  it('marks cells with check-ins', () => {
    const cells = computeHeatmap(checkIns, now);
    const last = cells[cells.length - 1]; // current week (May 17)
    expect(last.isCurrentWeek).toBe(true);
    expect(last.hasCheckIn).toBe(false); // not submitted yet this week
    const prevWeek = cells[cells.length - 2]; // May 10
    expect(prevWeek.hasCheckIn).toBe(true);
    expect(prevWeek.avgWellness).toBe(7.9);
  });
});
