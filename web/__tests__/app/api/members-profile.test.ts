/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockProfileRepo = { findByUserId: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn(() => mockProfileRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

describe('GET /api/members/[memberId]/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member reads a different member profile', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when member user not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns null when no profile exists for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('returns member profile for trainer with matching trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const profile = { userId: 'm1', sex: 'female', height: 162 };
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
  });

  it('returns member profile for owner without checking trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const profile = { userId: 'm1', sex: 'male' };
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
  });
});
