/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMedRepo = { findByMember: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
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

describe('GET /api/members/[memberId]/medications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member reads another member medications', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns medications for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findByMember.mockResolvedValue([{ _id: 'med1' }]);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/members/[memberId]/medications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to create a medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ name: 'X' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ name: 'X' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 when member creates medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.create.mockResolvedValue({ _id: 'med1' });
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ name: 'Ibuprofen', purpose: 'Pain', duration: 'short_term', startDate: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
  });
});
