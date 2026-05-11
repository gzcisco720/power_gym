jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(),
}));

import { POST, GET } from '@/app/api/me/workout-logs/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockSelfRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const mockTplRepo = jest.mocked(MongoPlanTemplateRepository);

const USER = '507f1f77bcf86cd799439011';

describe('/api/me/workout-logs', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST', () => {
    it('returns guard response when guard fails', async () => {
      const forbidden = Response.json({ error: 'Forbidden' }, { status: 403 });
      mockGuard.mockResolvedValue({ ok: false, response: forbidden });
      const res = await POST(new Request('http://x', { method: 'POST', body: '{}' }));
      expect(res.status).toBe(403);
    });

    it('creates a log when no active log exists', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const create = jest.fn().mockResolvedValue({ _id: 'log1' });
      const findActive = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ create, findActive } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(201);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER, dayName: 'Freestyle',
          sourceTemplateId: null, sourceTemplateDayNumber: null, sets: [],
        }),
      );
    });

    it('returns 409 ACTIVE_SESSION_EXISTS when an active log exists', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findActive = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-active' },
        dayName: 'Push',
        startedAt: new Date('2026-05-11T10:00:00Z'),
        sets: [{ completedAt: new Date() }, { completedAt: new Date() }, { completedAt: null }],
      });
      const create = jest.fn();
      mockSelfRepo.mockImplementation(
        () => ({ findActive, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as {
        error: string;
        activeSession: { _id: string; dayName: string; setCount: number };
      };
      expect(body.error).toBe('ACTIVE_SESSION_EXISTS');
      expect(body.activeSession._id).toBe('log-active');
      expect(body.activeSession.dayName).toBe('Push');
      expect(body.activeSession.setCount).toBe(2);
      expect(create).not.toHaveBeenCalled();
    });

    it('deletes active log and creates new when ?deleteActive=true', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findActive = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-old' },
        dayName: 'Push',
        startedAt: new Date(),
        sets: [],
      });
      const deleteFn = jest.fn().mockResolvedValue(true);
      const create = jest.fn().mockResolvedValue({ _id: 'log-new' });
      mockSelfRepo.mockImplementation(
        () => ({ findActive, delete: deleteFn, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x?deleteActive=true', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(201);
      expect(deleteFn).toHaveBeenCalledWith('log-old', USER);
      expect(create).toHaveBeenCalled();
    });

    it('returns 400 when dayName missing', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const res = await POST(
        new Request('http://x', { method: 'POST', body: JSON.stringify({ plannedSets: [] }) }),
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when sourceTemplateId given but template not found', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findById = jest.fn().mockResolvedValue(null);
      mockTplRepo.mockImplementation(() => ({ findById } as unknown as MongoPlanTemplateRepository));
      const findActive = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ findActive } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({
            dayName: 'Push Day',
            sourceTemplateId: '507f1f77bcf86cd799439040',
            sourceTemplateDayNumber: 1,
            plannedSets: [],
          }),
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET', () => {
    it('returns month list', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
      const findByUserMonth = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
      mockSelfRepo.mockImplementation(
        () => ({ findByUserMonth } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await GET(new Request('http://x?year=2026&month=5'));
      expect(res.status).toBe(200);
      expect(findByUserMonth).toHaveBeenCalledWith(USER, 2026, 5);
    });

    it('returns 400 when year/month missing', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
      const res = await GET(new Request('http://x'));
      expect(res.status).toBe(400);
    });
  });
});
