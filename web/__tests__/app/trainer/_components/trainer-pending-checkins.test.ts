/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const authState = { impl: jest.fn() };
jest.mock('@/lib/auth/auth', () => ({ auth: (...args: unknown[]) => authState.impl(...args) }));

const mockCheckInRepo = { findRecentByTrainer: jest.fn() };
const mockUserRepo = { findAllMembers: jest.fn() };

jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

describe('TrainerPendingCheckIns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    authState.impl.mockResolvedValue({ user: { id: 't1', role: 'trainer' } });
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue([]);
    mockUserRepo.findAllMembers.mockResolvedValue([]);
  });

  it('renders empty state when no recent check-ins', async () => {
    const { TrainerPendingCheckIns } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-pending-checkins'
    );
    const result = await TrainerPendingCheckIns();
    const html = JSON.stringify(result);
    expect(html).toContain('All caught up');
  });

  it('returns null when unauthenticated', async () => {
    authState.impl.mockResolvedValue(null);
    const { TrainerPendingCheckIns } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-pending-checkins'
    );
    const result = await TrainerPendingCheckIns();
    expect(result).toBeNull();
  });

  it('shows member name for recent check-in', async () => {
    const memberId = '000000000000000000000001';
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => memberId }, name: 'Li Na' },
    ]);
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue([
      { memberId: { toString: () => memberId }, submittedAt: new Date() },
    ]);

    const { TrainerPendingCheckIns } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-pending-checkins'
    );
    const result = await TrainerPendingCheckIns();
    const html = JSON.stringify(result);
    expect(html).toContain('Li Na');
  });

  it('shows at most 4 check-ins', async () => {
    const members = Array.from({ length: 6 }, (_, i) => ({
      _id: { toString: () => `m${i}` },
      name: `Member ${i}`,
    }));
    mockUserRepo.findAllMembers.mockResolvedValue(members);
    mockCheckInRepo.findRecentByTrainer.mockResolvedValue(
      members.map((m) => ({ memberId: { toString: () => m._id.toString() }, submittedAt: new Date() })),
    );

    const { TrainerPendingCheckIns } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-pending-checkins'
    );
    const result = await TrainerPendingCheckIns();
    const html = JSON.stringify(result);
    // Only 4 should appear; Member 4 and 5 should not
    expect(html).toContain('Member 0');
    expect(html).toContain('Member 3');
    expect(html).not.toContain('Member 4');
  });
});
