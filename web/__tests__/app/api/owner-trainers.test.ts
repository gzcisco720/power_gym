/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = {
  findByRole: jest.fn(),
  findAllMembers: jest.fn(),
  updateTrainerId: jest.fn(),
  findById: jest.fn(),
};
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

describe('GET /api/owner/trainers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/owner/trainers/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as never);
    const { GET } = await import('@/app/api/owner/trainers/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns trainers with member counts and session counts', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as never);
    mockUserRepo.findByRole.mockResolvedValue([
      { _id: { toString: () => 't1' }, name: 'Li Wei', email: 'li@gym.com', createdAt: new Date('2026-01-01') },
    ]);
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' } },
    ]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(5);

    const { GET } = await import('@/app/api/owner/trainers/route');
    const res = await GET();
    const data = await res.json() as { _id: string; memberCount: number; sessionsThisMonth: number }[];

    expect(res.status).toBe(200);
    expect(data[0].memberCount).toBe(1);
    expect(data[0].sessionsThisMonth).toBe(5);
    expect(data[0]._id).toBe('t1');
  });
});

describe('DELETE /api/owner/trainers/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 'o1' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as never);
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 'o1' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 if trainer not found', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 'o1' }) }),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    );
    expect(res.status).toBe(404);
  });

  it('reassigns all members then returns 200', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 't1', role: 'trainer' });
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' } },
      { _id: { toString: () => 'm2' } },
    ]);
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 'o1' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );

    expect(res.status).toBe(200);
    expect(mockUserRepo.updateTrainerId).toHaveBeenCalledTimes(2);
    expect(mockUserRepo.updateTrainerId).toHaveBeenCalledWith('m1', 'o1');
    expect(mockUserRepo.updateTrainerId).toHaveBeenCalledWith('m2', 'o1');
  });
});

describe('DELETE /api/owner/trainers/[id] — email notification', () => {
  const sendMemberAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendMemberAssigned: sendMemberAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
  });

  it('fires sendMemberAssigned to the new trainer with all reassigned member names', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1', name: 'Owner' } } as never);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 't1', role: 'trainer' })
      .mockResolvedValueOnce({ _id: 'o1', name: 'Owner', email: 'owner@gym.com' });
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' }, name: 'Alice' },
      { _id: { toString: () => 'm2' }, name: 'Bob' },
    ]);
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 'o1' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(sendMemberAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@gym.com',
      memberNames: ['Alice', 'Bob'],
      assignerName: 'Owner',
    }));
  });
});
