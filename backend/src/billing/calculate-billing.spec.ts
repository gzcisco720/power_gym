import { calculateMemberBilling, BillingSession } from './calculate-billing';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<BillingSession> = {}): BillingSession {
  return {
    _id: 's1',
    date: new Date('2026-01-01'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    serviceType: {
      _id: 'st1',
      name: 'PT',
      pricePerSession: 100,
      currency: 'AUD',
    },
    ...overrides,
  };
}

const NOW = new Date('2026-06-01');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateMemberBilling', () => {
  it('excludes cancelled sessions', () => {
    const sessions = [makeSession({ status: 'cancelled' })];
    const result = calculateMemberBilling(sessions, NOW);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
  });

  it('excludes sessions with a future date (date >= now)', () => {
    const sessions = [makeSession({ date: NOW })]; // same instant — date >= now
    const result = calculateMemberBilling(sessions, NOW);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
  });

  it('excludes sessions with no serviceType (null)', () => {
    const sessions = [makeSession({ serviceType: null })];
    const result = calculateMemberBilling(sessions, NOW);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
  });

  it('sums price across all qualifying sessions', () => {
    const sessions = [
      makeSession({ _id: 's1', date: new Date('2026-01-01') }),
      makeSession({ _id: 's2', date: new Date('2026-02-01') }),
    ];
    const result = calculateMemberBilling(sessions, NOW);
    expect(result.total).toBe(200);
    expect(result.count).toBe(2);
  });

  it("defaults currency to 'AUD' when no qualifying sessions exist", () => {
    const result = calculateMemberBilling([], NOW);
    expect(result.currency).toBe('AUD');
  });
});
