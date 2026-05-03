/** @jest-environment node */
export {};
process.env.CRON_SECRET = 'test-secret';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockRepo = { findUnreminded: jest.fn(), markReminderSent: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockEmailService = { sendSessionReminder: jest.fn() };
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn(() => mockEmailService) }));

describe('GET /api/cron/session-reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/session-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer wrong' } }));
    expect(res.status).toBe(401);
  });

  it('sends reminders for unreminded sessions', async () => {
    mockRepo.findUnreminded.mockResolvedValue([
      {
        _id: { toString: () => 's1' },
        trainerId: { toString: () => 't1' },
        memberIds: [{ toString: () => 'm1' }],
        date: new Date('2026-05-05'),
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Mike', email: 'mike@gym.com' })  // trainer
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@gym.com' }); // member

    const { GET } = await import('@/app/api/cron/session-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledTimes(1);
    expect(mockRepo.markReminderSent).toHaveBeenCalledWith('s1');
  });

  it('skips session when trainer is not found', async () => {
    mockRepo.findUnreminded.mockResolvedValue([
      {
        _id: { toString: () => 's1' },
        trainerId: { toString: () => 't1' },
        memberIds: [{ toString: () => 'm1' }],
        date: new Date('2026-05-05'),
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    mockUserRepo.findById.mockResolvedValue(null); // trainer not found
    const { GET } = await import('@/app/api/cron/session-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
    expect(mockRepo.markReminderSent).not.toHaveBeenCalled();
  });

  it('sends to all members and populates groupMembers correctly for group sessions', async () => {
    mockRepo.findUnreminded.mockResolvedValue([
      {
        _id: { toString: () => 's1' },
        trainerId: { toString: () => 't1' },
        memberIds: [{ toString: () => 'm1' }, { toString: () => 'm2' }],
        date: new Date('2026-05-05'),
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Coach', email: 'coach@gym.com' })   // trainer
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@gym.com' })   // member 1
      .mockResolvedValueOnce({ name: 'Bob', email: 'bob@gym.com' });      // member 2

    const { GET } = await import('@/app/api/cron/session-reminders/route');
    await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));

    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledTimes(2);
    // Alice's email should list Bob as groupMember
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith(
      expect.objectContaining({ memberName: 'Alice', groupMembers: ['Bob'] }),
    );
    // Bob's email should list Alice as groupMember
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith(
      expect.objectContaining({ memberName: 'Bob', groupMembers: ['Alice'] }),
    );
  });
});
