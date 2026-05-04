/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findByMonth: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('POST /api/sessions — trainer creates for member', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows trainer to create session for a specific memberId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const plan = {
      _id: 'mp1',
      days: [{
        dayNumber: 1,
        name: 'Push Day',
        exercises: [{ exerciseId: 'e1', exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12 }],
      }],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    mockSessionRepo.create.mockResolvedValue({ _id: 's1' });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'm1', memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    expect(mockMemberPlanRepo.findActive).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      loggedBy: 't1',
    }));
  });
});

describe('GET /api/sessions — calendar month filter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls findByMonth when year and month params are provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const sessions = [{ _id: 's1', dayName: 'Pull Day' }];
    mockSessionRepo.findByMonth.mockResolvedValue(sessions);

    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1&year=2026&month=5'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSessionRepo.findByMonth).toHaveBeenCalledWith('m1', 2026, 5);
    expect(data).toEqual(sessions);
  });

  it('calls findByMember when no year/month provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockSessionRepo.findByMember.mockResolvedValue([]);

    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSessionRepo.findByMember).toHaveBeenCalledWith('m1');
    expect(data).toEqual([]);
  });
});
