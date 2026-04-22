/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockNutritionPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockNutritionPlanRepo),
}));

const mockTemplateRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
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

describe('GET /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns active nutrition plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = { _id: 'np1', name: '减脂计划', isActive: true };
    mockNutritionPlanRepo.findActive.mockResolvedValue(plan);

    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(plan);
  });

  it('returns null when no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockNutritionPlanRepo.findActive.mockResolvedValue(null);

    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('assigns template as deep copy to member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 'trainer1' } });
    const template = {
      _id: 'tpl1',
      name: '增肌计划',
      dayTypes: [{ name: '训练日', targetKcal: 3000, targetProtein: 200, targetCarbs: 300, targetFat: 80, meals: [] }],
    };
    mockTemplateRepo.findById.mockResolvedValue(template);
    mockNutritionPlanRepo.deactivateAll.mockResolvedValue(undefined);
    const created = { _id: 'np1', name: '增肌计划', isActive: true };
    mockNutritionPlanRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl1' }),
      }),
      makeParams('m1'),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      trainerId: 'trainer1',
      name: '增肌计划',
    }));
    expect(data).toEqual(created);
  });
});
