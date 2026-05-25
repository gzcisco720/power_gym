interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function checkRateLimitByIp(ip: string, name: string, limit: number, windowMs: number): boolean {
  const key = `${ip}:${name}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function checkRateLimit(req: Request, name: string, limit: number, windowMs: number): boolean {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : '127.0.0.1').trim();
  return checkRateLimitByIp(ip, name, limit, windowMs);
}

export function _resetForTesting(): void {
  store.clear();
}
