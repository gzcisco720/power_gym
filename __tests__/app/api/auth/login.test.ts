/**
 * @jest-environment node
 */
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => true) }));
jest.mock('@/lib/auth/auth', () => ({
  handlers: {
    GET: jest.fn(() => new Response('ok', { status: 200 })),
    POST: jest.fn(() => new Response('ok', { status: 200 })),
  },
}));

import { checkRateLimit } from '@/lib/rate-limit';
const mockCheckRateLimit = jest.mocked(checkRateLimit);

describe('POST /api/auth/[...nextauth]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const { POST } = await import('@/app/api/auth/[...nextauth]/route');
    const req = new Request('http://localhost/api/auth/signin', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ nextauth: ['signin'] }) });
    expect(res.status).toBe(429);
  });

  it('delegates to NextAuth handler when not rate limited', async () => {
    const { POST } = await import('@/app/api/auth/[...nextauth]/route');
    const { handlers } = await import('@/lib/auth/auth');
    const req = new Request('http://localhost/api/auth/signin', { method: 'POST' });
    const ctx = { params: Promise.resolve({ nextauth: ['signin'] }) };
    await POST(req, ctx);
    expect(handlers.POST).toHaveBeenCalled();
  });
});
