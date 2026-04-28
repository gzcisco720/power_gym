/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findLatestByMember: jest.fn() };
const mockSessionRepo = { findMemberStats: jest.fn() };
const mockPlanRepo = { findActive: jest.fn() };

jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('MemberHubOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.findLatestByMember.mockResolvedValue(null);
    mockSessionRepo.findMemberStats.mockResolvedValue({
      completedCount: 0,
      lastCompletedAt: null,
    });
    mockPlanRepo.findActive.mockResolvedValue(null);
  });

  it('renders without throwing when all data is null', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('fetches body test, stats and plan in parallel', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    await Page(makeParams('m1'));
    expect(mockBodyTestRepo.findLatestByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('passes body test data when available', async () => {
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({
      weight: 73,
      bodyFatPct: 18.2,
    });
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });
});
