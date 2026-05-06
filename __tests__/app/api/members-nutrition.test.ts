/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({
  getEmailService: () => ({ sendNutritionPlanAssigned: jest.fn().mockResolvedValue(undefined) }),
}));

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

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('owner can assign template to any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'owner1', role: 'owner', name: 'Owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: '增肌计划', dayTypes: [] });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: '增肌计划' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl1' }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 'owner1',
      templateId: 'tpl1',
    }));
  });

  it('trainer cannot assign to non-own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('direct creation accepts {name, dayTypes} without templateId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' } });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: '直建计划' });

    const dayTypes = [{ name: 'Training', meals: [] }];
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '直建计划', dayTypes }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 't1',
      templateId: null,
      name: '直建计划',
      dayTypes,
    }));
  });

  it('returns 400 when body is neither shape', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({}) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns active plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockNutritionPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('blocks cross-member GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });
});
