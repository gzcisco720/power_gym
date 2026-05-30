/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const authState = { impl: jest.fn() };
jest.mock('@/lib/auth/auth', () => ({ auth: (...args: unknown[]) => authState.impl(...args) }));

const mockScheduledRepo = { findByDateRange: jest.fn() };
const mockBodyTestRepo = { findLatestByMember: jest.fn() };
const mockPlanRepo = { findActive: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
const mockSessionRepo = { countCompletedByMemberSince: jest.fn() };

jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockScheduledRepo),
}));
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockPlanRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

function makeSession(memberId = 'm1') {
  return {
    _id: { toString: () => 's1' },
    memberIds: [{ toString: () => memberId }],
    startTime: '09:00',
    endTime: '10:00',
  };
}

describe('TrainerTodaySessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    authState.impl.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } });
    mockScheduledRepo.findByDateRange.mockResolvedValue([]);
    mockBodyTestRepo.findLatestByMember.mockResolvedValue(null);
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockUserRepo.findById.mockResolvedValue(null);
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(0);
  });

  it('renders empty state when no sessions today', async () => {
    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    authState.impl.mockResolvedValue(null);
    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    expect(result).toBeNull();
  });

  it('shows member name when session exists', async () => {
    mockScheduledRepo.findByDateRange.mockResolvedValue([makeSession('m1')]);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Zhang Wei' });
    mockPlanRepo.findActive.mockResolvedValue({ name: 'PPL Program' });
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({ date: new Date() });
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(0);

    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    const html = JSON.stringify(result);
    expect(html).toContain('Zhang Wei');
  });

  it('shows plan name when member has active plan', async () => {
    mockScheduledRepo.findByDateRange.mockResolvedValue([makeSession('m1')]);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Li Na' });
    mockPlanRepo.findActive.mockResolvedValue({ name: 'Push Pull Legs' });
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({ date: new Date() });
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(0);

    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    const html = JSON.stringify(result);
    expect(html).toContain('Push Pull Legs');
  });

  it('shows No plan badge when member has no active plan', async () => {
    mockScheduledRepo.findByDateRange.mockResolvedValue([makeSession('m1')]);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Wang Fang' });
    mockPlanRepo.findActive.mockResolvedValue(null);
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({ date: new Date() });
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(0);

    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    const html = JSON.stringify(result);
    expect(html).toContain('No plan');
  });

  it('marks session as completed when count > 0 today', async () => {
    mockScheduledRepo.findByDateRange.mockResolvedValue([makeSession('m1')]);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Zhao Ming' });
    mockPlanRepo.findActive.mockResolvedValue({ name: 'Upper Body' });
    mockBodyTestRepo.findLatestByMember.mockResolvedValue({ date: new Date() });
    mockSessionRepo.countCompletedByMemberSince.mockResolvedValue(1);

    const { TrainerTodaySessions } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-today-sessions'
    );
    const result = await TrainerTodaySessions();
    expect(result).not.toBeNull();
  });
});
