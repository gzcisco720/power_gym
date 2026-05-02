/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
const mockTemplateRepo = { findById: jest.fn() };
const mockPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Trainer') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('POST /api/members/[memberId]/nutrition', () => {
  const sendNutritionPlanAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendNutritionPlanAssigned: sendNutritionPlanAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: 'Bulk Diet', dayTypes: [] });
    mockPlanRepo.deactivateAll.mockResolvedValue(undefined);
    mockPlanRepo.create.mockResolvedValue({ _id: 'plan1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('creates nutrition plan and returns 201', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(201);
  });

  it('fires sendNutritionPlanAssigned after creating plan', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1', 'Coach Bob'));
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(sendNutritionPlanAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      trainerName: 'Coach Bob',
      planName: 'Bulk Diet',
    }));
  });
});
