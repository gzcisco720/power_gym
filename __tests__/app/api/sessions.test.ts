/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('POST /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST', body: JSON.stringify({ memberPlanId: 'p1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to start session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'p1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(403);
  });

  it('pre-populates sets from plan day exercises and creates session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = {
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [
        {
          dayNumber: 1,
          name: 'Day 1 — Push',
          exercises: [
            {
              exerciseId: 'e1',
              exerciseName: 'Bench Press',
              groupId: 'A',
              isSuperset: false,
              isBodyweight: false,
              sets: 3,
              repsMin: 8,
              repsMax: 10,
              restSeconds: 90,
            },
          ],
        },
      ],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    const createdSession = { _id: 's1', dayNumber: 1, sets: [] };
    mockSessionRepo.create.mockResolvedValue(createdSession);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    const createCall = mockSessionRepo.create.mock.calls[0][0];
    expect(createCall.sets).toHaveLength(3);
    expect(createCall.sets[0]).toMatchObject({
      exerciseName: 'Bench Press',
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
    });
    expect(createCall.sets[2].setNumber).toBe(3);
  });

  it('returns 404 when member has no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sessions for self when member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const sessions = [{ _id: 's1' }];
    mockSessionRepo.findByMember.mockResolvedValue(sessions);

    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(sessions);
  });

  it('returns 403 when member queries another member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m2'));
    expect(res.status).toBe(403);
  });
});
