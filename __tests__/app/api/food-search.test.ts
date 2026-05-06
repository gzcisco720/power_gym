/** @jest-environment node */
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

import { auth } from '@/lib/auth/auth';
import { __resetFoodSearchCache } from '@/lib/nutrition/food-search';

const mockAuth = jest.mocked(auth);

const fetchSpy = jest.spyOn(global, 'fetch');

beforeEach(() => {
  jest.clearAllMocks();
  __resetFoodSearchCache();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

describe('GET /api/food-search', () => {
  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when q is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q='));
    expect(res.status).toBe(400);
  });

  it('maps OpenFoodFacts response to normalised results', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      products: [
        {
          product_name: 'Egg',
          nutriments: {
            'energy-kcal_100g': 155,
            'proteins_100g': 13,
            'carbohydrates_100g': 1.1,
            'fat_100g': 11,
            'fiber_100g': 0,
            'sugars_100g': 1.1,
            'salt_100g': 0.4,
            'saturated-fat_100g': 3.3,
          },
        },
        { product_name: 'Skip me', nutriments: {} },
      ],
    }), { status: 200 }));

    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    const body = (await res.json()) as { results: Array<{ name: string; per100g: { kcal: number; saturated?: number } }> };

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].name).toBe('Egg');
    expect(body.results[0].per100g.kcal).toBe(155);
    expect(body.results[0].per100g.saturated).toBe(3.3);
  });

  it('cache hit avoids second fetch', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      products: [{ product_name: 'Egg', nutriments: { 'energy-kcal_100g': 155, 'proteins_100g': 13, 'carbohydrates_100g': 1, 'fat_100g': 11 } }],
    }), { status: 200 }));

    const { GET } = await import('@/app/api/food-search/route');
    await GET(new Request('http://localhost/api/food-search?q=egg'));
    await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
