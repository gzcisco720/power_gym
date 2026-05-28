import { GET } from '@/app/api/food/[foodId]/route';
import { auth } from '@/lib/auth/auth';
import * as client from '@/lib/nutrition/fatsecret-client';

jest.mock('@/lib/auth/auth');
jest.mock('@/lib/nutrition/fatsecret-client');

describe('GET /api/food/[foodId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authed', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ foodId: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns the food detail', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    (client.fatsecretGetFood as jest.Mock).mockResolvedValue({ foodId: '1', name: 'Orange', brand: null, foodType: 'Generic', defaultServing: { servingId: 'a', description: '1 medium', grams: 131, calories: 62, protein: 1, carbs: 15, fat: 0.2 }, servings: [] });
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ foodId: '1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.food.foodId).toBe('1');
  });

  it('returns 502 on upstream failure', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    (client.fatsecretGetFood as jest.Mock).mockRejectedValue(new Error('boom'));
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ foodId: '1' }) });
    expect(res.status).toBe(502);
  });
});
