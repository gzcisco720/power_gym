/** @jest-environment node */
export {};
process.env.CRON_SECRET = 'test-secret';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockSelfRepo = {
  findStaleActive: jest.fn(),
  autoSeal: jest.fn(),
};
const mockSessionRepo = {
  findStaleActive: jest.fn(),
  autoSeal: jest.fn(),
};

jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(() => mockSelfRepo),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

describe('GET /api/cron/seal-stale-workouts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct secret', async () => {
    const { GET } = await import('@/app/api/cron/seal-stale-workouts/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer bad' } }));
    expect(res.status).toBe(401);
  });

  it('seals every stale log/session and reports counts', async () => {
    mockSelfRepo.findStaleActive.mockResolvedValue([{ _id: { toString: () => 'L1' } }, { _id: { toString: () => 'L2' } }]);
    mockSelfRepo.autoSeal.mockImplementation(async () => ({ autoSealed: true }));
    mockSessionRepo.findStaleActive.mockResolvedValue([{ _id: { toString: () => 'S1' } }]);
    mockSessionRepo.autoSeal.mockImplementation(async () => ({ autoSealed: true }));

    const { GET } = await import('@/app/api/cron/seal-stale-workouts/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);

    expect(mockSelfRepo.findStaleActive).toHaveBeenCalledWith(24);
    expect(mockSessionRepo.findStaleActive).toHaveBeenCalledWith(24);
    expect(mockSelfRepo.autoSeal).toHaveBeenCalledWith('L1');
    expect(mockSelfRepo.autoSeal).toHaveBeenCalledWith('L2');
    expect(mockSessionRepo.autoSeal).toHaveBeenCalledWith('S1');

    const body = await res.json() as { sealed: { selfWorkoutLogs: number; workoutSessions: number } };
    expect(body.sealed).toEqual({ selfWorkoutLogs: 2, workoutSessions: 1 });
  });

  it('reports 0 when no stale logs exist (idempotent)', async () => {
    mockSelfRepo.findStaleActive.mockResolvedValue([]);
    mockSessionRepo.findStaleActive.mockResolvedValue([]);

    const { GET } = await import('@/app/api/cron/seal-stale-workouts/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    const body = await res.json() as { sealed: { selfWorkoutLogs: number; workoutSessions: number } };
    expect(body.sealed).toEqual({ selfWorkoutLogs: 0, workoutSessions: 0 });
    expect(mockSelfRepo.autoSeal).not.toHaveBeenCalled();
    expect(mockSessionRepo.autoSeal).not.toHaveBeenCalled();
  });

  it('does not double-count when autoSeal returns already-completed (autoSealed=false)', async () => {
    mockSelfRepo.findStaleActive.mockResolvedValue([{ _id: { toString: () => 'L1' } }]);
    mockSelfRepo.autoSeal.mockResolvedValue({ autoSealed: false });
    mockSessionRepo.findStaleActive.mockResolvedValue([]);

    const { GET } = await import('@/app/api/cron/seal-stale-workouts/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    const body = await res.json() as { sealed: { selfWorkoutLogs: number; workoutSessions: number } };
    expect(body.sealed.selfWorkoutLogs).toBe(0);
  });
});
