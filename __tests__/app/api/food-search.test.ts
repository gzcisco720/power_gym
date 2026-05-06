import { GET } from '@/app/api/food-search/route';
import { auth } from '@/lib/auth/auth';
import * as client from '@/lib/nutrition/fatsecret-client';

jest.mock('@/lib/auth/auth');
jest.mock('@/lib/nutrition/fatsecret-client');

describe('GET /api/food-search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authed', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request('http://x/api/food-search?q=apple'));
    expect(res.status).toBe(401);
  });

  it('allows members to search (read-only)', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    (client.fatsecretSearch as jest.Mock).mockResolvedValue([]);
    const res = await GET(new Request('http://x/api/food-search?q=apple'));
    expect(res.status).toBe(200);
  });

  it('allows trainers to search', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'trainer' } });
    (client.fatsecretSearch as jest.Mock).mockResolvedValue([{ foodId: '1', name: 'X', brand: null, foodType: 'Generic', defaultServing: { servingId: 's', description: '100 g', grams: 100, calories: 1, protein: 0, carbs: 0, fat: 0 }, servings: [] }]);
    const res = await GET(new Request('http://x/api/food-search?q=x'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.results).toHaveLength(1);
  });

  it('returns 400 on empty q', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    const res = await GET(new Request('http://x/api/food-search?q='));
    expect(res.status).toBe(400);
  });

  it('clamps page_size to [1,50]', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    (client.fatsecretSearch as jest.Mock).mockResolvedValue([]);
    await GET(new Request('http://x/api/food-search?q=x&page_size=999'));
    expect(client.fatsecretSearch).toHaveBeenCalledWith('x', 50);
    await GET(new Request('http://x/api/food-search?q=x&page_size=0'));
    expect(client.fatsecretSearch).toHaveBeenCalledWith('x', 1);
  });

  it('returns 502 on upstream failure', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u', role: 'member' } });
    (client.fatsecretSearch as jest.Mock).mockRejectedValue(new Error('boom'));
    const res = await GET(new Request('http://x/api/food-search?q=apple'));
    expect(res.status).toBe(502);
  });
});
