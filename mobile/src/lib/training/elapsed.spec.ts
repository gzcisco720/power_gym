import { formatElapsed } from './elapsed';

describe('elapsed > formatElapsed', () => {
  it('formats a 75-second difference as "01:15"', () => {
    const startedAt = '2026-06-06T10:00:00.000Z';
    const now = new Date('2026-06-06T10:01:15.000Z');
    expect(formatElapsed(startedAt, now)).toBe('01:15');
  });

  it('formats a 0-second difference as "00:00"', () => {
    const startedAt = '2026-06-06T10:00:00.000Z';
    const now = new Date('2026-06-06T10:00:00.000Z');
    expect(formatElapsed(startedAt, now)).toBe('00:00');
  });

  it('formats a 3600-second difference as "60:00"', () => {
    const startedAt = '2026-06-06T10:00:00.000Z';
    const now = new Date('2026-06-06T11:00:00.000Z');
    expect(formatElapsed(startedAt, now)).toBe('60:00');
  });

  it('formats a 9-second difference as "00:09"', () => {
    const startedAt = '2026-06-06T10:00:00.000Z';
    const now = new Date('2026-06-06T10:00:09.000Z');
    expect(formatElapsed(startedAt, now)).toBe('00:09');
  });
});
