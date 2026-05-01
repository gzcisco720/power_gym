/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = { findAllMembers: jest.fn() };
const mockSessionRepo = { countByMemberIdsSince: jest.fn() };
const mockPlanRepo = { countByCreator: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockPlanRepo),
}));

describe('TrainerStatsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockSessionRepo.countByMemberIdsSince.mockResolvedValue(0);
    mockPlanRepo.countByCreator.mockResolvedValue(0);
  });

  it('fetches members for the trainer', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    await TrainerStatsSection({ trainerId: 't1' });
    expect(mockUserRepo.findAllMembers).toHaveBeenCalledWith('t1');
  });

  it('fetches template count for the trainer', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    await TrainerStatsSection({ trainerId: 't1' });
    expect(mockPlanRepo.countByCreator).toHaveBeenCalledWith('t1');
  });

  it('renders without throwing', async () => {
    const { TrainerStatsSection } = await import(
      '@/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section'
    );
    const result = await TrainerStatsSection({ trainerId: 't1' });
    expect(result).not.toBeNull();
  });
});
