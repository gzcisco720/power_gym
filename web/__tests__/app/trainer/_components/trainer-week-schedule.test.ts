/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const authState = { impl: jest.fn() };
jest.mock('@/lib/auth/auth', () => ({ auth: (...args: unknown[]) => authState.impl(...args) }));

const mockScheduledRepo = { findByDateRange: jest.fn() };

jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockScheduledRepo),
}));

describe('TrainerWeekSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    authState.impl.mockResolvedValue({ user: { id: 't1', role: 'trainer' } });
    mockScheduledRepo.findByDateRange.mockResolvedValue([]);
  });

  it('renders without throwing when no sessions this week', async () => {
    const { TrainerWeekSchedule } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-week-schedule'
    );
    const result = await TrainerWeekSchedule();
    expect(result).not.toBeNull();
  });

  it('returns null when unauthenticated', async () => {
    authState.impl.mockResolvedValue(null);
    const { TrainerWeekSchedule } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-week-schedule'
    );
    const result = await TrainerWeekSchedule();
    expect(result).toBeNull();
  });

  it('queries scheduled sessions for the current week', async () => {
    const { TrainerWeekSchedule } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-week-schedule'
    );
    await TrainerWeekSchedule();
    expect(mockScheduledRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      { trainerId: 't1' },
    );
  });

  it('shows this week label in output', async () => {
    const { TrainerWeekSchedule } = await import(
      '@/app/(dashboard)/trainer/_components/trainer-week-schedule'
    );
    const result = await TrainerWeekSchedule();
    const html = JSON.stringify(result);
    expect(html).toContain('This Week');
  });
});
