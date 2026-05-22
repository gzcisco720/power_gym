import { calculateMemberBilling, type BillingSession } from '@/lib/billing/calculate-billing';

const now = new Date('2026-05-22T12:00:00Z');

function makeSession(overrides: Partial<BillingSession> = {}): BillingSession {
  return {
    _id: 's1',
    date: new Date('2026-05-10T00:00:00Z'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    serviceType: { _id: 'st1', name: '1小时私教', pricePerSession: 300, currency: 'CNY' },
    ...overrides,
  };
}

describe('calculateMemberBilling', () => {
  it('sums pricePerSession for completed sessions', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', date: new Date('2026-05-17T00:00:00Z') })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(600);
    expect(result.count).toBe(2);
    expect(result.lines).toHaveLength(2);
  });

  it('excludes cancelled sessions', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', status: 'cancelled' })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(300);
    expect(result.count).toBe(1);
  });

  it('excludes sessions with no serviceType', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', serviceType: null })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(300);
  });

  it('excludes future sessions (date >= now)', () => {
    const future = makeSession({ _id: 's2', date: new Date('2026-05-25T00:00:00Z') });
    const result = calculateMemberBilling([makeSession(), future], now);
    expect(result.count).toBe(1);
  });

  it('returns zero total when no qualifying sessions', () => {
    const result = calculateMemberBilling([], now);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it('returns correct currency from first session', () => {
    const result = calculateMemberBilling([makeSession()], now);
    expect(result.currency).toBe('CNY');
  });
});
