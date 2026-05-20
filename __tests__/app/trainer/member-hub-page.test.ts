/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findByMember: jest.fn() };
const mockSessionRepo = {
  findMemberStats: jest.fn(),
  findRecentCompletedByMemberIds: jest.fn(),
};
const mockPlanRepo = { findActive: jest.fn() };
const mockInjuryRepo = { findActiveByMember: jest.fn() };
const mockMedRepo = { findByMember: jest.fn() };

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
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Page ────────────────────────────────────────────────────────────────────

describe('MemberHubOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.findByMember.mockResolvedValue([]);
    mockSessionRepo.findMemberStats.mockResolvedValue({ completedCount: 0, lastCompletedAt: null });
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([]);
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
    mockMedRepo.findByMember.mockResolvedValue([]);
  });

  it('renders non-null JSX when authenticated', async () => {
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/page');
    const result = await Page(makeParams('m1'));
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { default: Page } = await import('@/app/(dashboard)/trainer/members/[id]/page');
    const result = await Page(makeParams('m1'));
    expect(result).toBeNull();
  });
});

// ─── StatStripSection ─────────────────────────────────────────────────────────

describe('StatStripSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockBodyTestRepo.findByMember.mockResolvedValue([]);
    mockSessionRepo.findMemberStats.mockResolvedValue({ completedCount: 0, lastCompletedAt: null });
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([]);
  });

  it('calls findByMember, findMemberStats, and findRecentCompletedByMemberIds', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    await StatStripSection({ memberId: 'm1' });
    expect(mockBodyTestRepo.findByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findMemberStats).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findRecentCompletedByMemberIds).toHaveBeenCalledWith(['m1'], 1);
  });

  it('does not call findActive (plan moved to PlanCardSection)', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    await StatStripSection({ memberId: 'm1' });
    expect(mockPlanRepo.findActive).not.toHaveBeenCalled();
  });

  it('renders without throwing when all data is empty', async () => {
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    expect(result).not.toBeNull();
  });

  it('computes weight delta when two body tests are available', async () => {
    mockBodyTestRepo.findByMember.mockResolvedValue([
      { weight: 78, bodyFatPct: 18.0 },
      { weight: 79.2, bodyFatPct: 19.1 },
    ]);
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('1.2');
  });

  it('shows last session day name when available', async () => {
    mockSessionRepo.findRecentCompletedByMemberIds.mockResolvedValue([
      { memberId: 'm1', dayName: 'Push', completedAt: new Date() },
    ]);
    const { StatStripSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/stat-strip-section'
    );
    const result = await StatStripSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Push');
  });
});

// ─── PlanCardSection ──────────────────────────────────────────────────────────

describe('PlanCardSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockPlanRepo.findActive.mockResolvedValue(null);
  });

  it('calls findActive with memberId', async () => {
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    await PlanCardSection({ memberId: 'm1' });
    expect(mockPlanRepo.findActive).toHaveBeenCalledWith('m1');
  });

  it('renders plan name and Log Workout when plan exists', async () => {
    mockPlanRepo.findActive.mockResolvedValue({
      _id: 'p1',
      name: 'PPL — 3-Day Split',
      days: [{ name: 'Push' }, { name: 'Pull' }, { name: 'Legs' }],
      assignedAt: new Date('2026-04-02'),
      isActive: true,
    });
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    const result = await PlanCardSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('PPL');
    expect(html).toContain('Log Workout');
  });

  it('renders empty state with Assign Plan when no plan', async () => {
    const { PlanCardSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/plan-card-section'
    );
    const result = await PlanCardSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('No active training plan');
    expect(html).toContain('Assign Plan');
  });
});

// ─── HealthPanelSection ───────────────────────────────────────────────────────

describe('HealthPanelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockInjuryRepo.findActiveByMember.mockResolvedValue([]);
    mockMedRepo.findByMember.mockResolvedValue([]);
  });

  it('calls findActiveByMember and medication findByMember', async () => {
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    await HealthPanelSection({ memberId: 'm1' });
    expect(mockInjuryRepo.findActiveByMember).toHaveBeenCalledWith('m1');
    expect(mockMedRepo.findByMember).toHaveBeenCalledWith('m1');
  });

  it('renders injury title when active injury exists', async () => {
    mockInjuryRepo.findActiveByMember.mockResolvedValue([
      { _id: 'i1', title: 'Right shoulder tightness', status: 'active', affectedMovements: 'Overhead press' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Right shoulder tightness');
  });

  it('renders medication name when active medication exists', async () => {
    mockMedRepo.findByMember.mockResolvedValue([
      { _id: 'm1', name: 'Effexor', purpose: 'OCD', duration: 'long_term', startDate: new Date('2018-02-01'), status: 'active' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('Effexor');
  });

  it('renders ended medications as not visible (filtered out)', async () => {
    mockMedRepo.findByMember.mockResolvedValue([
      { _id: 'm2', name: 'OldMed', purpose: 'Test', duration: 'short_term', startDate: new Date(), status: 'ended' },
    ]);
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).not.toContain('OldMed');
  });

  it('renders No active concerns when no injuries and no active medications', async () => {
    const { HealthPanelSection } = await import(
      '@/app/(dashboard)/trainer/members/[id]/_components/health-panel-section'
    );
    const result = await HealthPanelSection({ memberId: 'm1' });
    const html = JSON.stringify(result);
    expect(html).toContain('No active concerns');
  });
});
