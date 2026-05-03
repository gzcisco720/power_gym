/** @jest-environment node */
export {};
process.env.CRON_SECRET = 'test-secret';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockRepo = { findActiveSeriesIds: jest.fn(), findLatestInSeries: jest.fn(), createMany: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

describe('GET /api/cron/extend-series', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct secret', async () => {
    const { GET } = await import('@/app/api/cron/extend-series/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer bad' } }));
    expect(res.status).toBe(401);
  });

  it('extends each active series by 1 week', async () => {
    mockRepo.findActiveSeriesIds.mockResolvedValue(['sid1']);
    const latest = {
      seriesId: { toString: () => 'sid1' },
      trainerId: { toString: () => 't1' },
      memberIds: [{ toString: () => 'm1' }],
      date: new Date('2026-07-01'),
      startTime: '09:00',
      endTime: '10:00',
    };
    mockRepo.findLatestInSeries.mockResolvedValue(latest);
    mockRepo.createMany.mockResolvedValue(undefined);

    const { GET } = await import('@/app/api/cron/extend-series/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockRepo.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        seriesId: 'sid1',
        trainerId: 't1',
        startTime: '09:00',
      }),
    ]);
  });

  it('skips series when findLatestInSeries returns null', async () => {
    mockRepo.findActiveSeriesIds.mockResolvedValue(['sid1']);
    mockRepo.findLatestInSeries.mockResolvedValue(null);
    const { GET } = await import('@/app/api/cron/extend-series/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    const body = await res.json() as { extended: number };
    expect(body.extended).toBe(0);
    expect(mockRepo.createMany).not.toHaveBeenCalled();
  });
});
