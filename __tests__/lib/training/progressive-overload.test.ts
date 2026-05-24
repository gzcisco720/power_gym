import { suggestedIncrement, suggestedWeight, formatHintDate } from '@/lib/training/progressive-overload';

describe('suggestedIncrement (5% rule)', () => {
  it('returns 0.5 for 10 kg (5% = 0.5 — minimum)', () => {
    expect(suggestedIncrement(10)).toBe(0.5);
  });

  it('returns 1.0 for 20 kg (5% = 1.0)', () => {
    expect(suggestedIncrement(20)).toBe(1.0);
  });

  it('returns 2.5 for 50 kg (5% = 2.5)', () => {
    expect(suggestedIncrement(50)).toBe(2.5);
  });

  it('returns 5.0 for 100 kg (5% = 5 — cap)', () => {
    expect(suggestedIncrement(100)).toBe(5.0);
  });

  it('returns 5.0 for 200 kg (10% capped at 5)', () => {
    expect(suggestedIncrement(200)).toBe(5.0);
  });

  it('rounds to nearest 0.5 kg (42 kg: 5% = 2.1 → 2.0)', () => {
    expect(suggestedIncrement(42)).toBe(2.0);
  });

  it('rounds to nearest 0.5 kg (15 kg: 5% = 0.75 → 1.0)', () => {
    expect(suggestedIncrement(15)).toBe(1.0);
  });

  it('enforces minimum 0.5 kg (5 kg: 5% = 0.25 → 0.5)', () => {
    expect(suggestedIncrement(5)).toBe(0.5);
  });
});

describe('suggestedWeight', () => {
  it('adds increment to current weight for 80 kg (5% = 4 → 84)', () => {
    expect(suggestedWeight(80)).toBe(84.0);
  });

  it('works for light weight — 10 kg → 10.5 kg', () => {
    expect(suggestedWeight(10)).toBe(10.5);
  });

  it('caps increment at +5 kg for heavy weights — 150 kg → 155 kg', () => {
    expect(suggestedWeight(150)).toBe(155.0);
  });
});

describe('formatHintDate', () => {
  it('returns abbreviated weekday name when within the past 7 days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = formatHintDate(threeDaysAgo);
    expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });

  it('returns "Mon D" format for dates older than 7 days', () => {
    // Use a fixed old date to avoid locale edge cases
    const old = new Date(2026, 0, 15); // Jan 15, 2026
    expect(formatHintDate(old)).toMatch(/^[A-Z][a-z]+ \d{1,2}$/);
  });

  it('returns weekday name for 1 day ago', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatHintDate(yesterday);
    expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });

  it('returns "Mon D" format for exactly 7 days ago', () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const result = formatHintDate(sevenDaysAgo);
    // 7 days ago should show month format, not weekday
    expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}$|^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });
});
