/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockProfileRepo = { findByUserId: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn(() => mockProfileRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns null when no profile exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });

  it('returns existing profile', async () => {
    const profile = { userId: 'u1', sex: 'female', height: 165 };
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(profile);
  });
});

describe('PATCH /api/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/profile/route');
    const res = await PATCH(new Request('http://localhost/', { method: 'PATCH', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('upserts profile and returns 200 with updated doc', async () => {
    const updated = { userId: 'u1', sex: 'male', height: 178 };
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.upsert.mockResolvedValue(updated);

    const { PATCH } = await import('@/app/api/profile/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sex: 'male', height: 178 }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
    expect(mockProfileRepo.upsert).toHaveBeenCalledWith('u1', { sex: 'male', height: 178 });
  });
});
