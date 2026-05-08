jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-nutrition-log.repository', () => ({
  MongoSelfNutritionLogRepository: jest.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/me/nutrition-logs/[date]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfNutritionLogRepository);

const USER = '507f1f77bcf86cd799439011';
const DATE = '2026-05-08';

describe('/api/me/nutrition-logs/[date]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET 200 with log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByDate = jest.fn().mockResolvedValue({ _id: 'log1' });
    mockRepo.mockImplementation(() => ({ findByDate } as unknown as MongoSelfNutritionLogRepository));
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(200);
    expect(findByDate).toHaveBeenCalledWith(USER, DATE);
  });

  it('GET 200 with null when missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByDate = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findByDate } as unknown as MongoSelfNutritionLogRepository));
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toBeNull();
  });

  it('PUT 400 when date format invalid', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ dayLabel: 'Freestyle', meals: [], dayCompleted: false, sourceTemplateId: null, sourceTemplateDayTypeName: null }) }),
      { params: Promise.resolve({ date: 'not-a-date' }) },
    );
    expect(res.status).toBe(400);
  });

  it('PUT 200 upserts log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const upsertByDate = jest.fn().mockResolvedValue({ _id: 'log1' });
    mockRepo.mockImplementation(() => ({ upsertByDate } as unknown as MongoSelfNutritionLogRepository));
    const body = {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      meals: [],
      dayCompleted: false,
    };
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }),
      { params: Promise.resolve({ date: DATE }) },
    );
    expect(res.status).toBe(200);
    expect(upsertByDate).toHaveBeenCalledWith(USER, DATE, body);
  });

  it('DELETE 204 on success', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const del = jest.fn().mockResolvedValue(true);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfNutritionLogRepository));
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(204);
  });

  it('DELETE 404 when nothing deleted', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const del = jest.fn().mockResolvedValue(false);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfNutritionLogRepository));
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(404);
  });
});
