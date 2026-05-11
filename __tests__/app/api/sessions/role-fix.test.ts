/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findActive: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('POST /api/sessions role fix', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows owner to create a session (no longer returns 403)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'owner1', role: 'owner' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'plan1', dayNumber: 1 }),
    }));
    expect(res.status).not.toBe(403);
  });

  it('allows trainer to create a session (no longer returns 403)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'plan1', dayNumber: 1 }),
    }));
    expect(res.status).not.toBe(403);
  });
});
