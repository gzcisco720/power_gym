/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  findById: jest.fn(),
  updateSet: jest.fn(),
  addExtraSet: jest.fn(),
};
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockPBRepo = { upsertIfBetter: jest.fn() };
jest.mock('@/lib/repositories/personal-best.repository', () => ({
  MongoPersonalBestRepository: jest.fn(() => mockPBRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makePatchParams(id: string, setIndex: string) {
  return { params: Promise.resolve({ id, setIndex }) };
}

function makePostParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/sessions/[id]/sets/[setIndex]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: '{}' }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-owner member tries to log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm2' },
      completedAt: null,
    });
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 409 when session already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: new Date(),
    });
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(409);
  });

  it('logs set and upserts PB when weight and reps provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const workoutSession = {
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [
        {
          exerciseId: { toString: () => 'e1' },
          exerciseName: 'Bench Press',
          setNumber: 1,
          isBodyweight: false,
          actualWeight: null,
          actualReps: null,
        },
      ],
    };
    mockSessionRepo.findById.mockResolvedValue(workoutSession);
    const updated = { ...workoutSession, sets: [{ ...workoutSession.sets[0], actualWeight: 100, actualReps: 8 }] };
    mockSessionRepo.updateSet.mockResolvedValue(updated);
    mockPBRepo.upsertIfBetter.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );

    expect(res.status).toBe(200);
    expect(mockSessionRepo.updateSet).toHaveBeenCalledWith('s1', 0, { actualWeight: 100, actualReps: 8 });
    expect(mockPBRepo.upsertIfBetter).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      weight: 100,
      reps: 8,
    }));
  });

  it('does not upsert PB for bodyweight exercise with null weight', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [{
        exerciseId: { toString: () => 'e1' },
        exerciseName: 'Pull-up',
        setNumber: 1,
        isBodyweight: true,
      }],
    });
    mockSessionRepo.updateSet.mockResolvedValue({});

    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: null, actualReps: 12 }),
      }),
      makePatchParams('s1', '0'),
    );

    expect(mockPBRepo.upsertIfBetter).not.toHaveBeenCalled();
  });
});

describe('POST /api/sessions/[id]/sets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds extra set and returns updated session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const exerciseId = '507f1f77bcf86cd799439011';
    const workoutSession = {
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [
        { exerciseId: { toString: () => exerciseId }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 1 },
        { exerciseId: { toString: () => exerciseId }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 2 },
        { exerciseId: { toString: () => exerciseId }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 3 },
      ],
    };
    mockSessionRepo.findById.mockResolvedValue(workoutSession);
    const updated = { ...workoutSession, sets: [...workoutSession.sets, { setNumber: 4 }] };
    mockSessionRepo.addExtraSet.mockResolvedValue(updated);

    const { POST } = await import('@/app/api/sessions/[id]/sets/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, prescribedRepsMin: 8, prescribedRepsMax: 10 }),
      }),
      makePostParams('s1'),
    );

    expect(res.status).toBe(201);
    const addCall = mockSessionRepo.addExtraSet.mock.calls[0][1];
    expect(addCall.setNumber).toBe(4);
    expect(addCall.isExtraSet).toBe(true);
  });
});
