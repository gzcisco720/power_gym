jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-nutrition-log.repository', () => ({
  MongoSelfNutritionLogRepository: jest.fn(),
}));

import { GET } from '@/app/api/me/nutrition-logs/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfNutritionLogRepository);

const USER = '507f1f77bcf86cd799439011';

describe('GET /api/me/nutrition-logs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns guard response on guard fail', async () => {
    mockGuard.mockResolvedValue({ ok: false, response: Response.json({}, { status: 403 }) });
    const res = await GET(new Request('http://x?year=2026&month=5'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when year/month missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const res = await GET(new Request('http://x'));
    expect(res.status).toBe(400);
  });

  it('returns month list', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByUserMonth = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
    mockRepo.mockImplementation(
      () => ({ findByUserMonth } as unknown as MongoSelfNutritionLogRepository),
    );
    const res = await GET(new Request('http://x?year=2026&month=5'));
    expect(res.status).toBe(200);
    expect(findByUserMonth).toHaveBeenCalledWith(USER, 2026, 5);
  });
});
