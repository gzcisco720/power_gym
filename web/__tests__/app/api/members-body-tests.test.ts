/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { create: jest.fn(), findByMember: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

describe('GET /api/members/[memberId]/body-tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns body tests for member viewing own history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const tests = [{ _id: 'bt1', bodyFatPct: 20 }];
    mockBodyTestRepo.findByMember.mockResolvedValue(tests);

    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(tests);
  });

  it('returns body tests when trainer accesses member history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const tests = [{ _id: 'bt1', bodyFatPct: 20 }];
    mockBodyTestRepo.findByMember.mockResolvedValue(tests);

    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/members/[memberId]/body-tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('creates body test for own member and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const created = { _id: 'bt1', bodyFatPct: 20, leanMassKg: 64, fatMassKg: 16 };
    mockBodyTestRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'other',
          bodyFatPct: 20,
          weight: 80,
          age: 30,
          sex: 'male',
          date: new Date().toISOString(),
          targetWeight: null,
          targetBodyFatPct: null,
        }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.bodyFatPct).toBe(20);
  });
});
