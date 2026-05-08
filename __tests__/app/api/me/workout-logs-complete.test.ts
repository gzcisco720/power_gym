jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));
jest.mock('@/lib/repositories/self-personal-best.repository', () => ({
  MongoSelfPersonalBestRepository: jest.fn(),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(),
}));

import { POST } from '@/app/api/me/workout-logs/[id]/complete/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const mockPbRepo = jest.mocked(MongoSelfPersonalBestRepository);
const mockTplRepo = jest.mocked(MongoPlanTemplateRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('POST /api/me/workout-logs/[id]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const upsertIfBetter = jest.fn().mockResolvedValue(true);
    mockPbRepo.mockImplementation(
      () => ({ upsertIfBetter } as unknown as MongoSelfPersonalBestRepository),
    );
  });

  it('completes the log with rpe + note', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const logObj = { _id: LOG_ID, completedAt: new Date(), sets: [] };
    const complete = jest.fn().mockResolvedValue({ ...logObj, toObject: () => logObj });
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
    const complete = jest
      .fn()
      .mockResolvedValue({ _id: LOG_ID, sets: [], toObject: () => ({ _id: LOG_ID }) });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    await POST(
      new Request('http://x', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, null, null);
  });

  it('handles truly empty body without crashing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest
      .fn()
      .mockResolvedValue({ _id: LOG_ID, sets: [], toObject: () => ({ _id: LOG_ID }) });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    // Truly empty body (no JSON at all). Mock req.json() throws like Next.js would.
    const req = new Request('http://x', { method: 'POST' });
    // Override req.json to simulate "Body has already been read or empty" failure
    Object.defineProperty(req, 'json', { value: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) });
    const res = await POST(req, { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(200);
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, null, null);
  });

  it('returns 400 when saveAsTemplate.name is empty', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ saveAsTemplate: { name: '   ' } }) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('creates a PlanTemplate when saveAsTemplate provided and returns createdTemplateId', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const completedLog = {
      _id: LOG_ID,
      dayName: 'Push Day',
      sets: [{
        exerciseId: '507f1f77bcf86cd799439030',
        exerciseName: 'Bench',
        groupId: 'g1',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 5,
        prescribedRepsMax: 8,
        actualWeight: 100,
        actualReps: 5,
        completedAt: new Date(),
      }],
      toObject: () => ({ _id: LOG_ID, dayName: 'Push Day' }),
    };
    const complete = jest.fn().mockResolvedValue(completedLog);
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));

    const tplCreate = jest.fn().mockResolvedValue({ _id: { toString: () => 'tpl1' } });
    mockTplRepo.mockImplementation(() => ({ create: tplCreate } as unknown as MongoPlanTemplateRepository));

    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ rpe: 8, note: null, saveAsTemplate: { name: 'My Push' } }),
      }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.createdTemplateId).toBe('tpl1');
    expect(tplCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My Push',
      createdBy: USER,
    }));
  });
});
