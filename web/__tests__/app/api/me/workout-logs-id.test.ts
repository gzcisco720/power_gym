jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { GET as activeGET } from '@/app/api/me/workout-logs/active/route';
import { GET as idGET, DELETE as idDELETE } from '@/app/api/me/workout-logs/[id]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('/api/me/workout-logs id+active', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET active returns 200 with log when found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findActive = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ findActive } as unknown as MongoSelfWorkoutLogRepository));
    const res = await activeGET();
    expect(res.status).toBe(200);
    expect(findActive).toHaveBeenCalledWith(USER);
  });

  it('GET active returns 200 with null when no active', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findActive = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findActive } as unknown as MongoSelfWorkoutLogRepository));
    const res = await activeGET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toBeNull();
  });

  it('GET id returns 404 when not found / not owned', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findById = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findById } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idGET(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(404);
  });

  it('GET id returns 200 with log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findById = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ findById } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idGET(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(200);
  });

  it('DELETE returns 204 on success', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const del = jest.fn().mockResolvedValue(true);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idDELETE(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(204);
  });

  it('DELETE returns 404 when nothing deleted', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const del = jest.fn().mockResolvedValue(false);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idDELETE(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(404);
  });
});
