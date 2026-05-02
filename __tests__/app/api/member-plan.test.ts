/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
const mockTemplateRepo = { findById: jest.fn() };
const mockMemberPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Trainer') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('GET /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ memberId: 'm1' }) });
    expect(res.status).toBe(401);
  });

  it('returns active plan for member', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    mockMemberPlanRepo.findActive.mockResolvedValue({ name: 'PPL' });
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ memberId: 'm1' }) });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/members/[memberId]/plan', () => {
  const sendPlanAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendPlanAssigned: sendPlanAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: 'PPL', days: [] });
    mockMemberPlanRepo.deactivateAll.mockResolvedValue(undefined);
    mockMemberPlanRepo.create.mockResolvedValue({ _id: 'plan1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('creates plan and returns 201', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(201);
  });

  it('fires sendPlanAssigned after creating plan', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1', 'Coach Bob'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(sendPlanAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      trainerName: 'Coach Bob',
      planName: 'PPL',
    }));
  });
});
