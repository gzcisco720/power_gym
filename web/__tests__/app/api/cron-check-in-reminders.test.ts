/** @jest-environment node */
export {};
process.env.CRON_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockConfigRepo = {
  findDueForReminder: jest.fn(),
  markReminderSent: jest.fn(),
};
jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockEmailService = { sendCheckInReminder: jest.fn() };
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn(() => mockEmailService) }));

describe('GET /api/cron/check-in-reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer wrong' } }));
    expect(res.status).toBe(401);
  });

  it('sends reminder email to member and marks config sent', async () => {
    mockConfigRepo.findDueForReminder.mockResolvedValue([
      {
        memberId: { toString: () => 'm1' },
        trainerId: { toString: () => 't1' },
      },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@gym.com' })   // member
      .mockResolvedValueOnce({ name: 'Coach Bob', email: 'bob@gym.com' }); // trainer

    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendCheckInReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@gym.com',
        memberName: 'Alice',
        trainerName: 'Coach Bob',
      }),
    );
    expect(mockConfigRepo.markReminderSent).toHaveBeenCalledWith('m1', expect.any(Date));
  });

  it('skips config when member is not found', async () => {
    mockConfigRepo.findDueForReminder.mockResolvedValue([
      { memberId: { toString: () => 'm1' }, trainerId: { toString: () => 't1' } },
    ]);
    mockUserRepo.findById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendCheckInReminder).not.toHaveBeenCalled();
    expect(mockConfigRepo.markReminderSent).not.toHaveBeenCalled();
  });

  it('skips config when trainer is not found', async () => {
    mockConfigRepo.findDueForReminder.mockResolvedValue([
      { memberId: { toString: () => 'm1' }, trainerId: { toString: () => 't1' } },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@gym.com' }) // member found
      .mockResolvedValueOnce(null);                                      // trainer not found

    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendCheckInReminder).not.toHaveBeenCalled();
    expect(mockConfigRepo.markReminderSent).not.toHaveBeenCalled();
  });
});
