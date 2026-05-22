/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const authState = { impl: jest.fn() };
jest.mock('@/lib/auth/auth', () => ({ auth: (...args: unknown[]) => authState.impl(...args) }));

const mockUserRepo = { findAllMembers: jest.fn() };
const mockSessionRepo = {
  countByMemberIdsSince: jest.fn(),
  countCompletedByMemberSince: jest.fn(),
};
const mockCheckInRepo = { findRecentByTrainer: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

describe('TrainerKpiStrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    authState.impl.mockResolvedValue({ user: { id: 't1', role: 'trainer' } });
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(0);
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue([]);
  });

  it('renders non-null when authenticated', async () => {
    const { TrainerKpiStrip } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-kpi-strip'
    );
    const result = await TrainerKpiStrip();
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    authState.impl.mockResolvedValue(null);
    const { TrainerKpiStrip } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-kpi-strip'
    );
    const result = await TrainerKpiStrip();
    expect(result).toBeNull();
  });

  it('calls findRecentByTrainer for pending check-ins count', async () => {
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' } },
    ]);
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue([{ memberId: 'm1', submittedAt: new Date() }]);

    const { TrainerKpiStrip } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-kpi-strip'
    );
    await TrainerKpiStrip();

    expect(mockCheckInRepo.findRecentByTrainer).toHaveBeenCalledWith('t1', expect.any(Date));
  });

  it('shows pending check-in count in rendered output', async () => {
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue([
      { memberId: 'm1', submittedAt: new Date() },
      { memberId: 'm2', submittedAt: new Date() },
    ]);

    const { TrainerKpiStrip } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-kpi-strip'
    );
    const result = await TrainerKpiStrip();
    const html = JSON.stringify(result);
    expect(html).toContain('Check-ins');
    expect(html).toContain('"2"');
  });
});
