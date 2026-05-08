jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST } from '@/app/api/me/workout-logs/[id]/complete/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('POST /api/me/workout-logs/[id]/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes the log with rpe + note', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue({ _id: LOG_ID, completedAt: new Date() });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ rpe: 8, note: 'good' }) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, 8, 'good');
  });

  it('returns 404 when log not found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    const res = await POST(
      new Request('http://x', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it('accepts empty body and uses null defaults', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    await POST(
      new Request('http://x', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, null, null);
  });

  it('handles truly empty body without crashing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    // Truly empty body (no JSON at all). Mock req.json() throws like Next.js would.
    const req = new Request('http://x', { method: 'POST' });
    // Override req.json to simulate "Body has already been read or empty" failure
    Object.defineProperty(req, 'json', { value: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) });
    const res = await POST(req, { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(200);
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, null, null);
  });
});
