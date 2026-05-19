/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockHistoryRepo = { findByMember: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/member-medical-history.repository', () => ({
  MongoMemberMedicalHistoryRepository: jest.fn(() => mockHistoryRepo),
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

describe('GET /api/members/[memberId]/medical-history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns null when no history exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockHistoryRepo.findByMember.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeNull();
  });

  it('returns 403 when member reads another member history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns medical history for trainer reading own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockHistoryRepo.findByMember.mockResolvedValue({ memberId: 'm1', chronicConditions: [] });
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/members/[memberId]/medical-history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to upsert', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PUT } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify({}) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 when member upserts their own history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockHistoryRepo.upsert.mockResolvedValue({ memberId: 'm1', chronicConditions: ['Hypertension'] });
    const { PUT } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await PUT(
      new Request('http://localhost/', {
        method: 'PUT',
        body: JSON.stringify({ chronicConditions: ['Hypertension'] }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(200);
  });
});
