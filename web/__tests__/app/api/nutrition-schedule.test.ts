/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockPlanRepo = { updateSchedule: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

const validBody = {
  weeklyPattern: [{ dayOfWeek: 1, dayTypeName: 'Training' }],
  calendarOverrides: [],
  iterate: true,
};

beforeEach(() => jest.clearAllMocks());

describe('PATCH /api/members/[memberId]/nutrition/schedule', () => {
  it('401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(401);
  });

  it('403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('403 when trainer not member owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('400 when iterate field is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const bodyWithoutIterate = { weeklyPattern: [], calendarOverrides: [] };
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(bodyWithoutIterate) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('200 updates schedule and returns updated plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    mockPlanRepo.updateSchedule.mockResolvedValue({ _id: 'np1', schedule: validBody });
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(200);
    expect(mockPlanRepo.updateSchedule).toHaveBeenCalledWith('m1', validBody);
  });

  it('200 persists iterate=false in the schedule', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    const bodyNoIterate = { weeklyPattern: [], calendarOverrides: [], iterate: false };
    mockPlanRepo.updateSchedule.mockResolvedValue({ _id: 'np1', schedule: bodyNoIterate });
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(bodyNoIterate) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(200);
    expect(mockPlanRepo.updateSchedule).toHaveBeenCalledWith('m1', bodyNoIterate);
  });

  it('404 when no active plan exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    mockPlanRepo.updateSchedule.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(404);
  });
});
