/**
 * @jest-environment node
 */

import { checkRateLimit, checkRateLimitByIp, _resetForTesting } from '@/lib/rate-limit';

function makeRequest(ip = '1.2.3.4'): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  });
}

beforeEach(() => _resetForTesting());

describe('checkRateLimit', () => {
  it('allows first request', () => {
    expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(true);
  });

  it('allows up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeRequest(), 'login', 5, 60_000);
    }
    expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(false);
  });

  it('resets after the window expires', () => {
    jest.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeRequest(), 'login', 5, 60_000);
    }
    expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(false);

    jest.advanceTimersByTime(60_001);
    expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(true);

    jest.useRealTimers();
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeRequest('1.2.3.4'), 'login', 5, 60_000);
    }
    expect(checkRateLimit(makeRequest('1.2.3.4'), 'login', 5, 60_000)).toBe(false);
    expect(checkRateLimit(makeRequest('5.6.7.8'), 'login', 5, 60_000)).toBe(true);
  });

  it('tracks different route names independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeRequest(), 'login', 5, 60_000);
    }
    expect(checkRateLimit(makeRequest(), 'login', 5, 60_000)).toBe(false);
    expect(checkRateLimit(makeRequest(), 'register', 5, 60_000)).toBe(true);
  });

  it('uses x-forwarded-for header for IP', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' },
    });
    for (let i = 0; i < 3; i++) {
      checkRateLimit(req, 'login', 3, 60_000);
    }
    expect(checkRateLimit(req, 'login', 3, 60_000)).toBe(false);
  });

  it('falls back to 127.0.0.1 when no IP header', () => {
    const req = new Request('http://localhost/');
    for (let i = 0; i < 3; i++) {
      checkRateLimit(req, 'login', 3, 60_000);
    }
    expect(checkRateLimit(req, 'login', 3, 60_000)).toBe(false);
  });
});

describe('checkRateLimitByIp', () => {
  it('allows requests up to the limit', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimitByIp('2.2.2.2', 'login', 3, 60_000)).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimitByIp('3.3.3.3', 'login', 3, 60_000);
    }
    expect(checkRateLimitByIp('3.3.3.3', 'login', 3, 60_000)).toBe(false);
  });

  it('shares the store with checkRateLimit for the same IP', () => {
    const req = makeRequest('4.4.4.4');
    checkRateLimit(req, 'login', 3, 60_000);
    checkRateLimit(req, 'login', 3, 60_000);
    // one more via byIp — should hit limit
    checkRateLimitByIp('4.4.4.4', 'login', 3, 60_000);
    expect(checkRateLimitByIp('4.4.4.4', 'login', 3, 60_000)).toBe(false);
  });
});
