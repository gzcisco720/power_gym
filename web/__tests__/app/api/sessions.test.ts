/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  create: jest.fn(),
  findByMember: jest.fn(),
  findActive: jest.fn(),
  findCompletedToday: jest.fn(),
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

  it('creates session with pre-populated sets when no active session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = {
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [{
        dayNumber: 1, name: 'Push',
        exercises: [{
          exerciseId: 'e1', exerciseName: 'Bench Press', groupId: 'A',
          isSuperset: false, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90,
        }],
      }],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    mockSessionRepo.findActive.mockResolvedValue(null);
    mockSessionRepo.findCompletedToday.mockResolvedValue(null);
    mockSessionRepo.create.mockResolvedValue({ _id: 's1', dayNumber: 1, sets: [] });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    const call = mockSessionRepo.create.mock.calls[0][0];
    expect(call.sets).toHaveLength(3);
    expect(call.sets[0]).toMatchObject({
      exerciseName: 'Bench Press', setNumber: 1,
      prescribedRepsMin: 8, prescribedRepsMax: 10,
      isExtraSet: false, actualWeight: null, actualReps: null,
    });
  });

  it('returns 200 (resume) when active session has same dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue({
      _id: 'mp1', memberId: { toString: () => 'm1' },
      days: [{ dayNumber: 1, name: 'Day A', exercises: [] }],
    });
    const existing = { _id: 'sExisting', dayNumber: 1, dayName: 'Day A', completedAt: null, sets: [] };
    mockSessionRepo.findActive.mockResolvedValue(existing);

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

  it('returns 409 ACTIVE_SESSION_EXISTS when active session has different dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sActive' }, dayNumber: 1, dayName: 'Day A',
      completedAt: null, startedAt: new Date(),
      sets: [{ completedAt: new Date() }, { completedAt: new Date() }],
    };
    mockSessionRepo.findActive.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('ACTIVE_SESSION_EXISTS');
    expect(data.activeSession).toMatchObject({
      _id: 'sActive', dayName: 'Day A', dayNumber: 1, setCount: 2,
    });
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('deletes active session and creates new when ?deleteActive=true', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sActive' }, dayNumber: 1, dayName: 'Day A',
      completedAt: null, startedAt: new Date(), sets: [],
    };
    mockSessionRepo.findActive.mockResolvedValue(existing);
    mockSessionRepo.delete.mockResolvedValue(true);
    mockSessionRepo.findCompletedToday.mockResolvedValue(null);
    mockSessionRepo.create.mockResolvedValue({ _id: 'sNew', dayNumber: 2 });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions?deleteActive=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));

    expect(res.status).toBe(201);
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('sActive');
    expect(mockSessionRepo.create).toHaveBeenCalled();
  });

  it('returns 409 DAY_ALREADY_LOGGED when completed session exists today', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    mockSessionRepo.findActive.mockResolvedValue(null);
    const completedSession = {
      _id: { toString: () => 'sCompleted' },
      dayName: 'Day A',
      completedAt: new Date(),
    };
    mockSessionRepo.findCompletedToday.mockResolvedValue(completedSession);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('DAY_ALREADY_LOGGED');
    expect(data.session).toMatchObject({ _id: 'sCompleted', dayName: 'Day A' });
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('does not call findCompletedToday when active session exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sActive' }, dayNumber: 1, dayName: 'Day A',
      completedAt: null, startedAt: new Date(),
      sets: [{ completedAt: new Date() }],
    };
    mockSessionRepo.findActive.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('ACTIVE_SESSION_EXISTS');
    expect(mockSessionRepo.findCompletedToday).not.toHaveBeenCalled();
  });
});

describe('GET /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sessions for self when member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findByMember.mockResolvedValue([{ _id: 's1' }]);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ _id: 's1' }]);
  });

  it('returns 403 when member queries another member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m2'));
    expect(res.status).toBe(403);
  });
});
