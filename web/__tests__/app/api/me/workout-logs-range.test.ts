jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { GET } from '@/app/api/me/workout-logs/range/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockSelfRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const USER = '507f1f77bcf86cd799439011';

describe('GET /api/me/workout-logs/range', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when guard fails', async () => {
    const forbidden = Response.json({ error: 'Forbidden' }, { status: 403 });
    mockGuard.mockResolvedValue({ ok: false, response: forbidden });
    const res = await GET(new Request('http://x/api/me/workout-logs/range?start=2026-05-11T00:00:00Z&end=2026-05-18T00:00:00Z'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when start or end missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await GET(new Request('http://x/api/me/workout-logs/range'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when dates are invalid', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await GET(new Request('http://x/api/me/workout-logs/range?start=bad&end=bad'));
    expect(res.status).toBe(400);
  });

  it('returns logs in the date range as shaped DTOs', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const fakeLogs = [
      {
        _id: { toString: () => 'log1' },
        dayName: 'Push',
        startedAt: new Date('2026-05-12T09:00:00Z'),
        completedAt: new Date('2026-05-12T10:00:00Z'),
        sets: [{}, {}],
        rpe: 8,
      },
    ];
    const findByUserDateRange = jest.fn().mockResolvedValue(fakeLogs);
    mockSelfRepo.mockImplementation(
      () => ({ findByUserDateRange }) as unknown as MongoSelfWorkoutLogRepository,
    );
    const res = await GET(
      new Request(
        'http://x/api/me/workout-logs/range?start=2026-05-11T00:00:00Z&end=2026-05-18T00:00:00Z',
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      _id: string;
      dayName: string;
      startedAt: string;
      completedAt: string | null;
      setCount: number;
      rpe: number | null;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0]._id).toBe('log1');
    expect(body[0].dayName).toBe('Push');
    expect(body[0].setCount).toBe(2);
    expect(body[0].rpe).toBe(8);
    expect(body[0].completedAt).toBe('2026-05-12T10:00:00.000Z');
    expect(findByUserDateRange).toHaveBeenCalledWith(
      USER,
      new Date('2026-05-11T00:00:00Z'),
      new Date('2026-05-18T00:00:00Z'),
    );
  });
});
