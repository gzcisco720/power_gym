/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = {
  findByRole: jest.fn(),
  findAllMembers: jest.fn(),
};
const mockInviteRepo = { findAll: jest.fn() };
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

describe('TrainerBreakdownSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findByRole.mockResolvedValue([]);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
  });

  it('fetches trainers and all members', async () => {
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    await TrainerBreakdownSection();
    expect(mockUserRepo.findByRole).toHaveBeenCalledWith('trainer');
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith();
  });

  it('renders without throwing when no trainers', async () => {
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    const result = await TrainerBreakdownSection();
    expect(result).not.toBeNull();
  });

  it('queries session count for each trainer', async () => {
    mockUserRepo.findByRole.mockResolvedValue([
      { _id: { toString: () => 't1' }, name: 'Trainer 1', email: 't1@test.com' },
    ]);
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' }, trainerId: { toString: () => 't1' } },
    ]);
    const { TrainerBreakdownSection } = await import(
      '@/app/(dashboard)/owner/_components/trainer-breakdown-section'
    );
    await TrainerBreakdownSection();
    expect(mockSessionRepo.countByMemberIdsSince).toHaveBeenCalledWith(
      ['m1'],
      expect.any(Date),
    );
  });
});

describe('DashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findByRole.mockResolvedValue([]);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockInviteRepo.findAll.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
  });

  it('fetches trainers, members and invites in parallel', async () => {
    const { DashboardStats } = await import(
      '@/app/(dashboard)/owner/_components/dashboard-stats'
    );
    await DashboardStats();
    expect(mockUserRepo.findByRole).toHaveBeenCalledWith('trainer');
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith();
    expect(mockInviteRepo.findAll).toHaveBeenCalledWith();
  });

  it('renders without throwing', async () => {
    const { DashboardStats } = await import(
      '@/app/(dashboard)/owner/_components/dashboard-stats'
    );
    const result = await DashboardStats();
    expect(result).not.toBeNull();
  });

  it('calls countByMemberIdsSince for all member ids', async () => {
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' } },
      { _id: { toString: () => 'm2' } },
    ]);
    const { DashboardStats } = await import(
      '@/app/(dashboard)/owner/_components/dashboard-stats'
    );
    await DashboardStats();
    expect(mockSessionRepo.countByMemberIdsSince).toHaveBeenCalledWith(
      ['m1', 'm2'],
      expect.any(Date),
    );
  });
});
