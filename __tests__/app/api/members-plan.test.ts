/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMemberPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

const mockTemplateRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
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

describe('GET /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns active plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    const plan = { _id: 'mp1', name: 'PPL', isActive: true };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);

    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(plan);
  });

  it('returns null when member has no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);

    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: null } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ templateId: 't1' }),
    }), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('assigns template as deep copy to member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 'trainer1' } });
    const template = {
      _id: 'tpl1',
      name: 'Push Pull Legs',
      days: [{ dayNumber: 1, name: 'Day 1 — Push', exercises: [] }],
    };
    mockTemplateRepo.findById.mockResolvedValue(template);
    mockMemberPlanRepo.deactivateAll.mockResolvedValue(undefined);
    const created = { _id: 'mp1', name: 'Push Pull Legs', isActive: true };
    mockMemberPlanRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'tpl1' }),
    }), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockMemberPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockMemberPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      trainerId: 'trainer1',
      name: 'Push Pull Legs',
    }));
    expect(data).toEqual(created);
  });
});
