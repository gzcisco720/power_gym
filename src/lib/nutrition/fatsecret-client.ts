import { getFatSecretToken } from './fatsecret-auth';

const SEARCH_URL = 'https://platform.fatsecret.com/rest/foods/search/v5';
const GET_URL = 'https://platform.fatsecret.com/rest/food/v5';

export interface FatSecretServing {
  servingId: string;
  description: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  transFat?: number;
}

export interface FatSecretFood {
  foodId: string;
  name: string;
  brand: string | null;
  foodType: 'Brand' | 'Generic';
  defaultServing: FatSecretServing;
  servings: FatSecretServing[];
}

const CACHE_MAX = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  expires: number;
  data: T;
}

const searchCache = new Map<string, CacheEntry<FatSecretFood[]>>();

function num(v: string | number | undefined): number | undefined {
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

interface RawServing {
  serving_id?: string;
  serving_description?: string;
  metric_serving_amount?: string | number;
  metric_serving_unit?: string;
  calories?: string | number;
  protein?: string | number;
  carbohydrate?: string | number;
  fat?: string | number;
  fiber?: string | number;
  sugar?: string | number;
  saturated_fat?: string | number;
  polyunsaturated_fat?: string | number;
  monounsaturated_fat?: string | number;
  cholesterol?: string | number;
  sodium?: string | number;
  potassium?: string | number;
  trans_fat?: string | number;
}

function mapServing(s: RawServing): FatSecretServing | null {
  if (s.metric_serving_unit !== 'g') return null;
  const grams = num(s.metric_serving_amount);
  const calories = num(s.calories);
  const protein = num(s.protein);
  const carbs = num(s.carbohydrate);
  const fat = num(s.fat);
  if (grams === undefined || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }
  const out: FatSecretServing = {
    servingId: s.serving_id ?? '',
    description: s.serving_description ?? `${grams} g`,
    grams,
    calories,
    protein,
    carbs,
    fat,
  };
  const fiber = num(s.fiber);
  if (fiber !== undefined) out.fiber = fiber;
  const sugar = num(s.sugar);
  if (sugar !== undefined) out.sugar = sugar;
  const sat = num(s.saturated_fat);
  if (sat !== undefined) out.saturated = sat;
  const poly = num(s.polyunsaturated_fat);
  if (poly !== undefined) out.polyunsaturated = poly;
  const mono = num(s.monounsaturated_fat);
  if (mono !== undefined) out.monounsaturated = mono;
  const chol = num(s.cholesterol);
  if (chol !== undefined) out.cholesterol = chol;
  const sod = num(s.sodium);
  if (sod !== undefined) out.sodium = sod;
  const pot = num(s.potassium);
  if (pot !== undefined) out.potassium = pot;
  const trans = num(s.trans_fat);
  if (trans !== undefined) out.transFat = trans;
  return out;
}

interface RawFood {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  servings?: { serving?: RawServing | RawServing[] };
}

function mapFood(f: RawFood): FatSecretFood | null {
  const foodId = f.food_id;
  const name = f.food_name?.trim();
  if (!foodId || !name) return null;
  const rawServings = ensureArray(f.servings?.serving);
  const servings = rawServings.map(mapServing).filter((s): s is FatSecretServing => s !== null);
  if (servings.length === 0) return null;
  return {
    foodId,
    name,
    brand: f.brand_name?.trim() || null,
    foodType: f.food_type === 'Brand' ? 'Brand' : 'Generic',
    defaultServing: servings[0],
    servings,
  };
}

interface SearchResponse {
  foods_search?: {
    results?: {
      food?: RawFood | RawFood[];
    };
  };
}

interface GetFoodResponse {
  food?: RawFood | null;
}

export async function fatsecretSearch(query: string, pageSize = 20): Promise<FatSecretFood[]> {
  const key = `${query.toLowerCase()}::${pageSize}`;
  const hit = searchCache.get(key);
  if (hit && hit.expires > Date.now()) {
    // LRU: re-insert to keep it fresh in insertion order
    searchCache.delete(key);
    searchCache.set(key, hit);
    return hit.data;
  }

  const token = await getFatSecretToken();
  const url = new URL(SEARCH_URL);
  url.searchParams.set('search_expression', query);
  url.searchParams.set('max_results', String(pageSize));
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`FatSecret search failed: ${res.status}`);

  const json = (await res.json()) as SearchResponse;
  const raw = ensureArray(json.foods_search?.results?.food);
  const data = raw.map(mapFood).filter((x): x is FatSecretFood => x !== null);

  if (searchCache.size >= CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

export async function fatsecretGetFood(foodId: string): Promise<FatSecretFood> {
  const token = await getFatSecretToken();
  const url = new URL(GET_URL);
  url.searchParams.set('food_id', foodId);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`FatSecret get-food failed: ${res.status}`);

  const json = (await res.json()) as GetFoodResponse;
  const food = json.food ? mapFood(json.food) : null;
  if (!food) throw new Error(`FatSecret returned invalid food ${foodId}`);
  return food;
}

export function __resetSearchCache(): void {
  searchCache.clear();
}
