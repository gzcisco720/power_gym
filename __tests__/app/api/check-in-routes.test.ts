/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockCheckInRepo = { findByMember: jest.fn(), findById: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

const mockConfigRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/check-ins', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins'));
    expect(res.status).toBe(401);
  });

  it('returns check-ins for authenticated member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockCheckInRepo.findByMember.mockResolvedValue([
      { _id: 'ci1', memberId: 'm1', submittedAt: new Date(), sleepQuality: 7 },
    ]);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins'));
    expect(res.status).toBe(200);
    const data = await res.json() as unknown[];
    expect(data).toHaveLength(1);
  });

  it('returns check-ins for authenticated trainer (memberId query param)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockCheckInRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins?memberId=m1'));
    expect(res.status).toBe(200);
    expect(mockCheckInRepo.findByMember).toHaveBeenCalledWith('m1');
  });

  it('returns 400 when trainer omits memberId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/check-ins/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/check-ins/[id]/route');
    const res = await GET(new Request('http://localhost/api/check-ins/ci1'), { params: Promise.resolve({ id: 'ci1' }) });
    expect(res.status).toBe(401);
  });

  it('returns check-in for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockCheckInRepo.findById.mockResolvedValue({ _id: 'ci1', sleepQuality: 8 });
    const { GET } = await import('@/app/api/check-ins/[id]/route');
    const res = await GET(new Request('http://localhost/api/check-ins/ci1'), { params: Promise.resolve({ id: 'ci1' }) });
    expect(res.status).toBe(200);
  });

  it('returns 404 when check-in not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockCheckInRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/check-ins/[id]/route');
    const res = await GET(new Request('http://localhost/api/check-ins/ci1'), { params: Promise.resolve({ id: 'ci1' }) });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/check-in-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(401);
  });

  it('returns config for member when memberId provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockConfigRepo.findByMember.mockResolvedValue({ dayOfWeek: 4, hour: 7, minute: 0, active: true });
    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(200);
    expect(mockConfigRepo.findByMember).toHaveBeenCalledWith('m1');
  });

  it('returns null when no config exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockConfigRepo.findByMember.mockResolvedValue(null);
    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(200);
    const data = await res.json() as { config: null };
    expect(data.config).toBeNull();
  });
});
