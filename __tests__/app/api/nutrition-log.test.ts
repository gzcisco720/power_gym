/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockLogRepo = { findByDate: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/nutrition-daily-log.repository', () => ({
  MongoNutritionDailyLogRepository: jest.fn(() => mockLogRepo),
}));

const mockPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, date: string) {
  return { params: Promise.resolve({ memberId, date }) };
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/members/[memberId]/nutrition/log/[date]', () => {
  it('member can read own', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue({ _id: 'log1', meals: [] });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    expect(res.status).toBe(200);
  });

  it('returns synthesised log from plan when none exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockPlanRepo.findActive.mockResolvedValue({
      _id: 'np1',
      assignedAt: new Date('2026-05-01'),
      schedule: {
        weeklyPattern: [{ dayOfWeek: 3, dayTypeName: 'Training' }],
        calendarOverrides: [],
        iterate: true,
      },
      dayTypes: [{ name: 'Training', meals: [{ name: 'Breakfast', order: 1, items: [{ foodName: 'Egg', quantityG: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }] }] }],
    });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    const data = (await res.json()) as { dayTypeName: string | null; meals: Array<{ completed: boolean }> };
    expect(res.status).toBe(200);
    expect(data.dayTypeName).toBe('Training');
    expect(data.meals[0].completed).toBe(false);
  });

  it('returns null log when no plan and no log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockPlanRepo.findActive.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    const data = await res.json();
    expect(data).toBeNull();
  });

  it('blocks cross-member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2', '2026-05-06'));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/members/[memberId]/nutrition/log/[date]', () => {
  const body = { dayTypeName: 'Training', meals: [], dayCompleted: false };

  it('only member can write own log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(403);
  });

  it('upserts when plan exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockLogRepo.upsert.mockResolvedValue({ _id: 'log1' });
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(200);
    expect(mockLogRepo.upsert).toHaveBeenCalledWith('m1', '2026-05-06', expect.objectContaining({ planId: 'np1' }));
  });

  it('403 when day already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    mockLogRepo.findByDate.mockResolvedValue({ _id: 'log1', dayCompleted: true });
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(403);
  });

  it('404 when no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue(null);
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(404);
  });
});
