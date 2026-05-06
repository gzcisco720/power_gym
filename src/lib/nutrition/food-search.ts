export interface FoodSearchResultMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
}

export interface FoodSearchResult {
  name: string;
  per100g: FoodSearchResultMacros;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  nutriments?: Record<string, number | undefined>;
}

interface OpenFoodFactsResponse {
  products?: OpenFoodFactsProduct[];
}

const CACHE_MAX = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expires: number;
  data: FoodSearchResult[];
}

const cache = new Map<string, CacheEntry>();

function cacheKey(q: string, pageSize: number): string {
  return `${q.toLowerCase()}::${pageSize}`;
}

function cacheGet(key: string): FoodSearchResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: FoodSearchResult[]): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

function num(v: number | undefined): number | undefined {
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
}

function mapProduct(p: OpenFoodFactsProduct): FoodSearchResult | null {
  const name = p.product_name?.trim();
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (!name || kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }
  const macros: FoodSearchResultMacros = { kcal, protein, carbs, fat };
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const salt = num(n['salt_100g']);
  const saturated = num(n['saturated-fat_100g']);
  if (fiber !== undefined) macros.fiber = fiber;
  if (sugar !== undefined) macros.sugar = sugar;
  if (salt !== undefined) macros.salt = salt;
  if (saturated !== undefined) macros.saturated = saturated;
  return { name, per100g: macros };
}

export async function searchFoods(query: string, pageSize = 20): Promise<FoodSearchResult[]> {
  const key = cacheKey(query, pageSize);
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('fields', 'product_name,nutriments');

  const res = await fetch(url, { headers: { 'User-Agent': 'PowerGym/1.0' } });
  if (!res.ok) throw new Error(`OpenFoodFacts request failed: ${res.status}`);
  const json = (await res.json()) as OpenFoodFactsResponse;

  const results = (json.products ?? [])
    .map(mapProduct)
    .filter((r): r is FoodSearchResult => r !== null);

  cacheSet(key, results);
  return results;
}

// Test-only export
export function __resetFoodSearchCache(): void {
  cache.clear();
}
