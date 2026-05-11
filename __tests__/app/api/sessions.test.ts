/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  create: jest.fn(),
  findByMember: jest.fn(),
  findToday: jest.fn(),
  delete: jest.fn(),
};
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

const PLAN_WITH_TWO_DAYS = {
  _id: 'mp1',
  memberId: { toString: () => 'm1' },
  days: [
    { dayNumber: 1, name: 'Day A', exercises: [] },
    { dayNumber: 2, name: 'Day B', exercises: [] },
  ],
};

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
    mockSessionRepo.findToday.mockResolvedValue(null);
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

  it('returns existing active session (200) when same dayNumber active today', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue({
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [{ dayNumber: 1, name: 'Day A', exercises: [] }],
    });
    const existing = { _id: 'sExisting', dayNumber: 1, dayName: 'Day A', completedAt: null };
    mockSessionRepo.findToday.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data._id).toBe('sExisting');
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('returns 409 TODAY_ALREADY_LOGGED when today has an active session with different dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sExisting' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: null,
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('TODAY_ALREADY_LOGGED');
    expect(data.existingSession).toMatchObject({ _id: 'sExisting', dayName: 'Day A', dayNumber: 1 });
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('returns 409 TODAY_ALREADY_LOGGED when today has a completed session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sDone' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: new Date(),
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('TODAY_ALREADY_LOGGED');
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('deletes today session and creates new when ?overwrite=true', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sOld' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: new Date(),
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);
    mockSessionRepo.delete.mockResolvedValue(true);
    mockSessionRepo.create.mockResolvedValue({ _id: 'sNew', dayNumber: 2 });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions?overwrite=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));

    expect(res.status).toBe(201);
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('sOld');
    expect(mockSessionRepo.create).toHaveBeenCalled();
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
