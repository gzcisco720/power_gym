import { fatsecretSearch, fatsecretGetFood, __resetSearchCache } from '@/lib/nutrition/fatsecret-client';
import { getFatSecretAuthProvider } from '@/lib/nutrition/fatsecret-auth';

jest.mock('@/lib/nutrition/fatsecret-auth', () => ({
  getFatSecretAuthProvider: jest.fn(),
}));

const mockProvider = {
  version: 'v2' as const,
  searchBaseUrl: 'https://platform.fatsecret.com/rest/foods/search/v5',
  foodBaseUrl: 'https://platform.fatsecret.com/rest/food/v5',
  searchExtraParams: {} as Record<string, string>,
  foodExtraParams: {} as Record<string, string>,
  applyAuth: jest.fn().mockImplementation(async (url: URL) => ({
    url,
    headers: { Authorization: 'Bearer tok' },
  })),
};

describe('fatsecretSearch', () => {
  beforeEach(() => {
    __resetSearchCache();
    global.fetch = jest.fn();
    (getFatSecretAuthProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.applyAuth as jest.Mock).mockClear();
    (mockProvider.applyAuth as jest.Mock).mockImplementation(async (url: URL) => ({
      url,
      headers: { Authorization: 'Bearer tok' },
    }));
  });

  it('returns normalised results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        foods_search: {
          results: {
            food: [{
              food_id: '1',
              food_name: 'Orange',
              brand_name: '',
              food_type: 'Generic',
              servings: { serving: [{
                serving_id: 's1',
                serving_description: '1 medium',
                metric_serving_amount: '131',
                metric_serving_unit: 'g',
                calories: '62', protein: '1.2', carbohydrate: '15.4', fat: '0.16',
                fiber: '3.1', sugar: '12.2',
              }] },
            }],
          },
        },
      }),
    });
    const out = await fatsecretSearch('orange');
    expect(out).toHaveLength(1);
    expect(out[0].foodId).toBe('1');
    expect(out[0].name).toBe('Orange');
    expect(out[0].defaultServing.calories).toBe(62);
    expect(out[0].defaultServing.fiber).toBe(3.1);
  });

  it('caches by query+pageSize', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ foods_search: { results: { food: [] } } }),
    });
    await fatsecretSearch('apple');
    await fatsecretSearch('apple');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles single-object food (FatSecret quirk: returns object not array when 1 match)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        foods_search: { results: { food: {
          food_id: '2', food_name: 'Pear', food_type: 'Generic',
          servings: { serving: { serving_id: 's2', serving_description: '1 g', metric_serving_amount: '1', metric_serving_unit: 'g', calories: '1', protein: '0', carbohydrate: '0', fat: '0' } },
        } } },
      }),
    });
    const out = await fatsecretSearch('pear');
    expect(out).toHaveLength(1);
  });

  it('returns empty array on no results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ foods_search: { results: {} } }),
    });
    const out = await fatsecretSearch('zzzz');
    expect(out).toEqual([]);
  });

  it('throws on upstream error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fatsecretSearch('x')).rejects.toThrow(/FatSecret search failed/);
  });

  it('drops servings with non-gram metric units', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        foods_search: { results: { food: [{
          food_id: '3', food_name: 'Milk', food_type: 'Generic',
          servings: { serving: [
            { serving_id: 'cup', serving_description: '1 cup', metric_serving_amount: '240', metric_serving_unit: 'ml', calories: '150', protein: '8', carbohydrate: '12', fat: '8' },
            { serving_id: 'g',   serving_description: '100 g', metric_serving_amount: '100', metric_serving_unit: 'g',  calories: '62',  protein: '3.3', carbohydrate: '5', fat: '3.3' },
          ] },
        }] } },
      }),
    });
    const out = await fatsecretSearch('milk');
    expect(out).toHaveLength(1);
    expect(out[0].servings).toHaveLength(1);
    expect(out[0].servings[0].servingId).toBe('g');
  });
});

describe('fatsecretGetFood', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    (getFatSecretAuthProvider as jest.Mock).mockReturnValue(mockProvider);
    (mockProvider.applyAuth as jest.Mock).mockClear();
    (mockProvider.applyAuth as jest.Mock).mockImplementation(async (url: URL) => ({
      url,
      headers: { Authorization: 'Bearer tok' },
    }));
  });

  it('returns multi-serving food detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        food: {
          food_id: '1', food_name: 'Orange', food_type: 'Generic',
          servings: { serving: [
            { serving_id: 'a', serving_description: '1 medium', metric_serving_amount: '131', metric_serving_unit: 'g', calories: '62', protein: '1', carbohydrate: '15', fat: '0.2' },
            { serving_id: 'b', serving_description: '100 g',    metric_serving_amount: '100', metric_serving_unit: 'g', calories: '47', protein: '0.9', carbohydrate: '12', fat: '0.1' },
          ] },
        },
      }),
    });
    const food = await fatsecretGetFood('1');
    expect(food.servings).toHaveLength(2);
    expect(food.servings[1].grams).toBe(100);
  });

  it('throws when food_id is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ food: null }) });
    await expect(fatsecretGetFood('bad')).rejects.toThrow(/invalid food/);
  });
});
