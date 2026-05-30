jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST as setsPOST } from '@/app/api/me/workout-logs/[id]/sets/route';
import { PATCH as setPATCH } from '@/app/api/me/workout-logs/[id]/sets/[setIndex]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('/api/me/workout-logs/[id]/sets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST appends a set', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const appendSet = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ appendSet } as unknown as MongoSelfWorkoutLogRepository));
    const setBody = {
      exerciseId: '507f1f77bcf86cd799439030',
      exerciseName: 'Squat',
      groupId: 'g2',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: null,
      prescribedRepsMax: null,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await setsPOST(
      new Request('http://x', { method: 'POST', body: JSON.stringify(setBody) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    expect(appendSet).toHaveBeenCalledWith(LOG_ID, USER, expect.objectContaining({ exerciseName: 'Squat' }));
  });

  it('PATCH updates a set', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const updateSet = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ updateSet } as unknown as MongoSelfWorkoutLogRepository));
    const res = await setPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ actualWeight: 100, actualReps: 5 }) }),
      { params: Promise.resolve({ id: LOG_ID, setIndex: '0' }) },
    );
    expect(res.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(LOG_ID, USER, 0, { actualWeight: 100, actualReps: 5 });
  });

  it('PATCH returns 404 when log not found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const updateSet = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ updateSet } as unknown as MongoSelfWorkoutLogRepository));
    const res = await setPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ actualWeight: null, actualReps: null }) }),
      { params: Promise.resolve({ id: LOG_ID, setIndex: '5' }) },
    );
    expect(res.status).toBe(404);
  });
});
