/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findLatestByMember: jest.fn() };
const mockSessionRepo = { findMemberStats: jest.fn() };
const mockPlanRepo = { findActive: jest.fn() };
const mockInjuryRepo = { findActiveByMember: jest.fn() };

jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));
jest.mock('@/lib/repositories/member-injury.repository', () => ({
  MongoMemberInjuryRepository: jest.fn(() => mockInjuryRepo),
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
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
  });

  it('renders non-null JSX when authenticated', async () => {
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import(
      '@/app/(dashboard)/trainer/members/[id]/page'
    );
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });
});

describe('StatCardsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBodyTestRepo.findLatestByMember.mockResolvedValue(null);
    mockSessionRepo.findMemberStats.mockResolvedValue({
      completedCount: 0,
      lastCompletedAt: null,
    });
    mockPlanRepo.findActive.mockResolvedValue(null);
  });

  it('fetches body test, stats and plan in parallel', async () => {
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    await StatCardsSection({ memberId: 'm1' });
    expect(mockBodyTestRepo.findLatestByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('renders without throwing when all data is null', async () => {
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    const result = await StatCardsSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });

  it('renders without throwing when body test data is available', async () => {
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({
      weight: 73,
      bodyFatPct: 18.2,
    });
    const { StatCardsSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-cards-section'
    );
    const result = await StatCardsSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });
});

describe('HealthSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
  });

  it('fetches active injuries for the member', async () => {
    const { HealthSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-section'
    );
    await HealthSection({ memberId: 'm1' });
    expect(mockInjuryRepo.findActiveByMember).toHaveBeenCalledWith('m1');
  });

  it('renders without throwing when no injuries', async () => {
    const { HealthSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-section'
    );
    const result = await HealthSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });
});
