import { resolveDayType } from '@/lib/nutrition/schedule';

const schedule = {
  weeklyPattern: [
    { dayOfWeek: 0 as const, dayTypeName: 'Rest' },
    { dayOfWeek: 1 as const, dayTypeName: 'Training' },
    { dayOfWeek: 3 as const, dayTypeName: 'Training' },
  ],
  calendarOverrides: [
    { date: '2026-05-04', dayTypeName: 'Cheat' },
  ],
  iterate: true,
};

const START = '2026-04-01';

describe('resolveDayType', () => {
  it('uses calendarOverride when date matches', () => {
    expect(resolveDayType(schedule, '2026-05-04', START)).toBe('Cheat');
  });

  it('falls back to weeklyPattern when no override', () => {
    // 2026-05-06 is Wednesday → dayOfWeek 3
    expect(resolveDayType(schedule, '2026-05-06', START)).toBe('Training');
  });

  it('returns null when neither matches', () => {
    // 2026-05-05 is Tuesday (dayOfWeek 2) — not in pattern
    expect(resolveDayType(schedule, '2026-05-05', START)).toBeNull();
  });

  it('returns null for empty schedule', () => {
    expect(resolveDayType({ weeklyPattern: [], calendarOverrides: [], iterate: true }, '2026-05-06', START)).toBeNull();
  });

  it('returns null when date is before plan start', () => {
    expect(resolveDayType(schedule, '2026-03-31', START)).toBeNull();
  });

  describe('iterate: false', () => {
    const nonIteratingSchedule = { ...schedule, iterate: false };

    it('resolves day within first week when pattern matches', () => {
      // START is 2026-04-01. 2026-04-06 is day 5 (< 7) → Monday (dayOfWeek 1) → 'Training'
      expect(resolveDayType(nonIteratingSchedule, '2026-04-06', START)).toBe('Training');
      // 2026-04-05 is day 4 → Sunday (dayOfWeek 0) → 'Rest'
      expect(resolveDayType(nonIteratingSchedule, '2026-04-05', START)).toBe('Rest');
    });

    it('returns null for date >= 7 days from start', () => {
      // 2026-04-08 is day 7 from 2026-04-01 → beyond first week → null
      expect(resolveDayType(nonIteratingSchedule, '2026-04-08', START)).toBeNull();
    });

    it('returns null for date in pattern but beyond first week', () => {
      // 2026-04-13 is Monday (dayOfWeek 1) in pattern, but day 12 from start → null
      expect(resolveDayType(nonIteratingSchedule, '2026-04-13', START)).toBeNull();
    });
  });
});
