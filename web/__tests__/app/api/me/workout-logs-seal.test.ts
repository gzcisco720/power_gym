jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST } from '@/app/api/me/workout-logs/[id]/seal/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const USER = '507f1f77bcf86cd799439011';

describe('POST /api/me/workout-logs/[id]/seal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards guard failure', async () => {
    mockGuard.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'L1' }),
    });
    expect(res.status).toBe(403);
  });

  it('seals the log via repo.seal', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const seal = jest.fn().mockResolvedValue({
      _id: 'L1',
      completedAt: new Date('2026-05-09T18:00:00Z'),
      autoSealed: false,
    });
    mockRepo.mockImplementation(() => ({ seal } as unknown as MongoSelfWorkoutLogRepository));

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'L1' }),
    });
    expect(res.status).toBe(200);
    expect(seal).toHaveBeenCalledWith('L1', USER);
  });

  it('returns 404 when seal returns null', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const seal = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ seal } as unknown as MongoSelfWorkoutLogRepository));

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'unknown' }),
    });
    expect(res.status).toBe(404);
  });
});
