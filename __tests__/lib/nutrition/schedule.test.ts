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
};

describe('resolveDayType', () => {
  it('uses calendarOverride when date matches', () => {
    expect(resolveDayType(schedule, '2026-05-04')).toBe('Cheat');
  });

  it('falls back to weeklyPattern when no override', () => {
    // 2026-05-06 is Wednesday → dayOfWeek 3
    expect(resolveDayType(schedule, '2026-05-06')).toBe('Training');
  });

  it('returns null when neither matches', () => {
    // 2026-05-05 is Tuesday (dayOfWeek 2) — not in pattern
    expect(resolveDayType(schedule, '2026-05-05')).toBeNull();
  });

  it('returns null for empty schedule', () => {
    expect(resolveDayType({ weeklyPattern: [], calendarOverrides: [] }, '2026-05-06')).toBeNull();
  });
});
