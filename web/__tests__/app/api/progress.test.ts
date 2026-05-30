/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockWorkoutRepo = { findExerciseHistory: jest.fn() };
const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockWorkoutRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

function makeReq(memberId: string, exerciseId?: string): Request {
  const url = exerciseId
    ? `http://localhost/api/progress/${memberId}?exerciseId=${exerciseId}`
    : `http://localhost/api/progress/${memberId}`;
  return new Request(url);
}

describe('GET /api/progress/[memberId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m2', 'ex1'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when exerciseId is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1'), makeParams('m1'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'exerciseId is required' });
  });

  it('returns 404 when trainer queries a non-existent member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('nonexistent', 'ex1'), makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer queries a member belonging to different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      trainerId: { toString: () => 't2' },
    });
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for member accessing own data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const history = [{ date: new Date('2026-03-01'), estimatedOneRM: 80 }];
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue(history);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toEqual([{ date: '2026-03-01', estimatedOneRM: 80 }]);
  });

  it('returns 200 for trainer querying own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toEqual([]);
  });

  it('returns 200 for owner querying any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('formats date as YYYY-MM-DD in response', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([
      { date: new Date('2026-04-15T14:30:00.000Z'), estimatedOneRM: 95.3 },
    ]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    const data = await res.json();
    expect(data.history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
