import { buildKpiData } from '@/app/(dashboard)/member/_components/member-kpi-strip.utils';

describe('buildKpiData', () => {
  const now = new Date('2026-05-16T12:00:00Z');

  it('computes deltas correctly when both tests exist', () => {
    const latest = { weight: 75.3, bodyFatPct: 18.5 };
    const previous = { weight: 75.8, bodyFatPct: 19.2 };
    const result = buildKpiData({ sessionsThisMonth: 12, latest, previous, topPb: null, now });
    expect(result.weightDelta).toBe(-0.5);
    expect(result.bfDelta).toBeCloseTo(-0.7, 1);
    expect(result.weightImproved).toBe(true);
    expect(result.bfImproved).toBe(true);
  });

  it('returns null deltas when only one test exists', () => {
    const latest = { weight: 75.3, bodyFatPct: 18.5 };
    const result = buildKpiData({ sessionsThisMonth: 5, latest, previous: null, topPb: null, now });
    expect(result.weightDelta).toBeNull();
    expect(result.bfDelta).toBeNull();
  });

  it('marks pr as new when achieved within 7 days', () => {
    const topPb = {
      exerciseName: 'Squat',
      estimatedOneRM: 140,
      achievedAt: new Date('2026-05-14T10:00:00Z'),
    };
    const result = buildKpiData({ sessionsThisMonth: 5, latest: null, previous: null, topPb, now });
    expect(result.isNewPr).toBe(true);
  });
});
