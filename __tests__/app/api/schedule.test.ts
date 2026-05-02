/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockRepo = {
  create: jest.fn(),
  createMany: jest.fn(),
  findByDateRange: jest.fn(),
  findByMember: jest.fn(),
};
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('POST /api/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when memberIds is empty', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [], date: '2026-05-01', startTime: '09:00', endTime: '10:00' }),
    }));
    expect(res.status).toBe(400);
  });

  it('creates single session for trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.create.mockResolvedValue({ _id: 's1' });
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: false }),
    }));
    expect(res.status).toBe(201);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ trainerId: 't1', seriesId: null }));
  });

  it('creates 12 recurring sessions', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.createMany.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: true }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json() as { sessions: unknown[] };
    expect(body.sessions).toHaveLength(12);
    expect(mockRepo.createMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ startTime: '09:00' }),
    ]));
  });

  it('owner must provide trainerId', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00' }),
    }));
    expect(res.status).toBe(400);
  });

  it('owner can create session with explicit trainerId', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    mockRepo.create.mockResolvedValue({ _id: 's1' });
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainerId: 't1', memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: false }),
    }));
    expect(res.status).toBe(201);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ trainerId: 't1' }));
  });
});

describe('POST /api/schedule — email notification', () => {
  const sendSessionBookedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendSessionBooked: sendSessionBookedMock } as unknown as ReturnType<typeof getEmailService>);
    mockRepo.create.mockResolvedValue({ _id: 's1' });
    mockRepo.createMany.mockResolvedValue(undefined);
  });

  it('fires sendSessionBooked for each member after single session creation', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'Coach Bob' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 'm1', email: 'alice@test.com', name: 'Alice' })
      .mockResolvedValueOnce({ _id: 't1', name: 'Coach Bob' });
    const { POST } = await import('@/app/api/schedule/route');
    await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: false }),
    }));
    expect(sendSessionBookedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      trainerName: 'Coach Bob',
      startTime: '09:00',
      endTime: '10:00',
      isRecurring: false,
    }));
  });

  it('fires sendSessionBooked with isRecurring:true and sessionCount:12 for recurring', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'Coach Bob' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 'm1', email: 'alice@test.com', name: 'Alice' })
      .mockResolvedValueOnce({ _id: 't1', name: 'Coach Bob' });
    const { POST } = await import('@/app/api/schedule/route');
    await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: true }),
    }));
    expect(sendSessionBookedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      isRecurring: true,
      sessionCount: 12,
    }));
  });
});

describe('GET /api/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/schedule/route');
    const res = await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when start/end missing', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { GET } = await import('@/app/api/schedule/route');
    const res = await GET(new Request('http://localhost/api/schedule'));
    expect(res.status).toBe(400);
  });

  it('trainer sees own sessions only', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), { trainerId: 't1' },
    );
  });

  it('owner sees all sessions (no trainerId filter)', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), {},
    );
  });

  it('owner with trainerId filter calls findByDateRange with trainerId', async () => {
    const validTrainerId = 'a1b2c3d4e5f6a1b2c3d4e5f6';
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request(`http://localhost/api/schedule?start=2026-05-01&end=2026-05-07&trainerId=${validTrainerId}`));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), { trainerId: validTrainerId },
    );
  });

  it('owner with invalid trainerId returns 400', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { GET } = await import('@/app/api/schedule/route');
    const res = await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07&trainerId=invalid'));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeDefined();
  });

  it('member sees own sessions via memberId filter', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), { memberId: 'm1' },
    );
  });
});
