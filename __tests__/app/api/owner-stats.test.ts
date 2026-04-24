/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockUserRepo = { findByRole: jest.fn(), findAllMembers: jest.fn() };
const mockInviteRepo = { findAll: jest.fn() };
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/owner/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/owner/stats/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is not owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as never);
    const { GET } = await import('@/app/api/owner/stats/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns global stats for owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as never);
    mockUserRepo.findByRole.mockResolvedValueOnce([{ _id: 't1' }, { _id: 't2' }]);
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' } },
      { _id: { toString: () => 'm2' } },
      { _id: { toString: () => 'm3' } },
    ]);
    const now = new Date();
    mockInviteRepo.findAll.mockResolvedValue([
      { usedAt: null, expiresAt: new Date(now.getTime() + 86400000) },   // pending
      { usedAt: new Date(), expiresAt: new Date(now.getTime() + 86400000) }, // used
      { usedAt: null, expiresAt: new Date(now.getTime() - 86400000) },   // expired
    ]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(12);

    const { GET } = await import('@/app/api/owner/stats/route');
    const res = await GET();
    const data = await res.json() as Record<string, number>;

    expect(res.status).toBe(200);
    expect(data.trainerCount).toBe(2);
    expect(data.memberCount).toBe(3);
    expect(data.pendingInviteCount).toBe(1);
    expect(data.sessionsThisMonth).toBe(12);
  });
});
