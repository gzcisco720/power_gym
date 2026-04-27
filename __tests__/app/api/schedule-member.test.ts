/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const params = { params: Promise.resolve({ memberId: 'm1' }) };

describe('GET /api/schedule/member/[memberId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(401);
  });

  it('member can only fetch own schedule', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm2'));
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(403);
  });

  it('member can fetch own schedule', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    mockRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(200);
  });

  it('returns upcoming and history split for trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const now = new Date();
    const past = new Date(now.getTime() - 86400000);
    const future = new Date(now.getTime() + 86400000);
    mockRepo.findByMember.mockResolvedValue([
      { _id: 'p1', date: past, status: 'scheduled' },
      { _id: 'f1', date: future, status: 'scheduled' },
    ]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(200);
    const body = await res.json() as { upcoming: unknown[]; history: unknown[] };
    expect(body.upcoming).toHaveLength(1);
    expect(body.history).toHaveLength(1);
  });

  it('cancelled sessions go to history even if date is future', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const future = new Date(Date.now() + 86400000);
    mockRepo.findByMember.mockResolvedValue([
      { _id: 'c1', date: future, status: 'cancelled' },
    ]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    const body = await res.json() as { upcoming: unknown[]; history: unknown[] };
    expect(body.upcoming).toHaveLength(0);
    expect(body.history).toHaveLength(1);
  });

  it('trainer can view any member schedule', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(200);
    expect(mockRepo.findByMember).toHaveBeenCalledWith('m1');
  });

  it('owner can view any member schedule', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    mockRepo.findByMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(200);
    expect(mockRepo.findByMember).toHaveBeenCalledWith('m1');
  });
});
