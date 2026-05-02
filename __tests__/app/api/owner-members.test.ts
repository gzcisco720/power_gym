/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = {
  findAllMembers: jest.fn(),
  findById: jest.fn(),
  updateTrainerId: jest.fn(),
};
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockScheduleRepo = { removeMemberFromFutureSessions: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockScheduleRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

describe('GET /api/owner/members', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/owner/members/route');
    const res = await GET(new Request('http://localhost/api/owner/members'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/owner/members/route');
    const res = await GET(new Request('http://localhost/api/owner/members'));
    expect(res.status).toBe(403);
  });

  it('returns all members when no trainerId filter', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' }, name: 'M1', email: 'm1@x.com', trainerId: { toString: () => 't1' }, createdAt: new Date() },
    ]);
    const { GET } = await import('@/app/api/owner/members/route');
    const res = await GET(new Request('http://localhost/api/owner/members'));
    expect(res.status).toBe(200);
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith(undefined);
  });

  it('passes trainerId filter when provided', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    const { GET } = await import('@/app/api/owner/members/route');
    const res = await GET(new Request('http://localhost/api/owner/members?trainerId=t1'));
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith('t1');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/owner/members/[id]/trainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 if member not found', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(404);
  });

  it('calls updateTrainerId and returns 200', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', role: 'member' });
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
    mockScheduleRepo.removeMemberFromFutureSessions.mockResolvedValue(undefined);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockUserRepo.updateTrainerId).toHaveBeenCalledWith('m1', 't2');
  });
});

describe('PATCH /api/owner/members/[id]/trainer — unassign side effect', () => {
  it('calls removeMemberFromFutureSessions after updateTrainerId', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', role: 'member' });
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
    mockScheduleRepo.removeMemberFromFutureSessions.mockResolvedValue(undefined);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(mockScheduleRepo.removeMemberFromFutureSessions).toHaveBeenCalledWith('m1');
  });
});

describe('PATCH /api/owner/members/[id]/trainer — email notification', () => {
  const sendMemberAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendMemberAssigned: sendMemberAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
    mockScheduleRepo.removeMemberFromFutureSessions.mockResolvedValue(undefined);
  });

  it('fires sendMemberAssigned to the new trainer after assignment', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1', name: 'Owner' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 'm1', role: 'member', name: 'Alice' })
      .mockResolvedValueOnce({ _id: 't2', name: 'Coach Bob', email: 'bob@gym.com' });
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(sendMemberAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'bob@gym.com',
      trainerName: 'Coach Bob',
      memberNames: ['Alice'],
      assignerName: 'Owner',
    }));
  });
});
