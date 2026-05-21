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

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

const emptySchedule = { weeklyPattern: [], calendarOverrides: [], iterate: true };
const validBody = { name: 'Bulk Plan', dayTypes: [{ name: 'Training', meals: [] }], schedule: emptySchedule };

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}
function makeRequest(body: unknown) {
  return new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects member role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when body is missing required fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest({}), makeParams('m1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when schedule is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      makeRequest({ name: 'Plan', dayTypes: [] }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when schedule is missing required fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      makeRequest({ name: 'Plan', dayTypes: [], schedule: {} }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('trainer cannot assign to a member belonging to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('creates plan with name, dayTypes, schedule, and templateId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const body = { ...validBody, templateId: 'tpl1' };
    const res = await POST(makeRequest(body), makeParams('m1'));

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 't1',
      templateId: 'tpl1',
      name: 'Bulk Plan',
      schedule: emptySchedule,
    }));
  });

  it('creates plan without templateId when not provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: null }),
    );
  });

  it('owner can create plan for any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner', name: 'Owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(201);
  });

  it('returns 404 when member does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(404);
  });

  it('returns 201 even when email notification fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    // Make the email service throw by mocking it before import
    const emailModule = jest.mocked(require('@/lib/email/index'));
    emailModule.getEmailService = jest.fn(() => ({
      sendNutritionPlanAssigned: jest.fn().mockRejectedValue(new Error('SMTP down')),
    }));

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(201);
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
