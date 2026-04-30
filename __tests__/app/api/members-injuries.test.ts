/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockInjuryRepo = {
  findByMember: jest.fn(),
  create: jest.fn(),
};
jest.mock('@/lib/repositories/member-injury.repository', () => ({
  MongoMemberInjuryRepository: jest.fn(() => mockInjuryRepo),
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

describe('GET /api/members/[memberId]/injuries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member reads another member\'s injuries', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when trainer: member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns injuries for trainer with own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const injuries = [{ _id: 'i1', title: 'Knee' }];
    mockInjuryRepo.findByMember.mockResolvedValue(injuries);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(injuries);
  });

  it('returns injuries for owner without trainer check', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockInjuryRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('returns injuries for member reading own records', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/members/[memberId]/injuries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member tries to POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ title: 'x' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when title missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('creates injury and returns 201 for trainer with own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const created = { _id: 'i1', title: 'Knee strain', memberId: 'm1' };
    mockInjuryRepo.create.mockResolvedValue(created);
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Knee strain' }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(mockInjuryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'm1', title: 'Knee strain' }),
    );
  });

  it('returns 400 on invalid JSON', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: 'not-json' }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });
});
