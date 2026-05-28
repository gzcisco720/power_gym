import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

// ── Auth provider interfaces ──────────────────────────────────────────────────

interface IFatSecretAuthProvider {
  readonly version: 'v1' | 'v2';
  readonly searchBaseUrl: string;
  readonly searchExtraParams: Record<string, string>;
  applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }>;
}

class OAuth2AuthProvider implements IFatSecretAuthProvider {
  readonly version = 'v2' as const;
  readonly searchBaseUrl =
    'https://platform.fatsecret.com/rest/foods/search/v5';
  readonly searchExtraParams: Record<string, string> = {};

  private cached: { token: string; expiresAt: number } | null = null;
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async applyAuth(
    url: URL,
  ): Promise<{ url: URL; headers: Record<string, string> }> {
    const token = await this.getToken();
    return { url, headers: { Authorization: `Bearer ${token}` } };
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now + 60_000)
      return this.cached.token;
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'basic',
    });
    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const res = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `FatSecret token request failed: ${res.status} ${detail}`,
      );
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.cached = {
      token: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return json.access_token;
  }
}

class OAuth1AuthProvider implements IFatSecretAuthProvider {
  readonly version = 'v1' as const;
  readonly searchBaseUrl = 'https://platform.fatsecret.com/rest/server.api';
  readonly searchExtraParams = { method: 'foods.search' };

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomBytes(8).toString('hex');

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.clientId,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
    };

    const allParams: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      allParams[k] = v;
    });
    Object.assign(allParams, oauthParams);

    const pe = (s: string) => encodeURIComponent(s);
    const sorted = Object.entries(allParams).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const paramString = sorted.map(([k, v]) => `${pe(k)}=${pe(v)}`).join('&');
    const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
    const baseString = `GET&${pe(baseUrl)}&${pe(paramString)}`;
    const signingKey = `${pe(this.clientSecret)}&`;
    const signature = createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    const signedUrl = new URL(baseUrl);
    for (const [k, v] of sorted) signedUrl.searchParams.set(k, v);
    signedUrl.searchParams.set('oauth_signature', signature);

    return Promise.resolve({ url: signedUrl, headers: {} });
  }
}

// ── Response shapes ───────────────────────────────────────────────────────────

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

interface RawFoodImage {
  image_url?: string;
  image_type?: string;
}

interface RawFood {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  food_description?: string;
  food_images?: { food_image?: RawFoodImage | RawFoodImage[] };
  servings?: { serving?: RawServing | RawServing[] };
}

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
  imageUrl?: string;
  defaultServing: FatSecretServing;
  servings: FatSecretServing[];
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

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

function mapServing(s: RawServing): FatSecretServing | null {
  if (s.metric_serving_unit !== 'g') return null;
  const grams = num(s.metric_serving_amount);
  const calories = num(s.calories);
  const protein = num(s.protein);
  const carbs = num(s.carbohydrate);
  const fat = num(s.fat);
  if (
    grams === undefined ||
    calories === undefined ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  )
    return null;

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

function parseDescriptionServing(desc: string): FatSecretServing | null {
  const g = desc.match(/Per\s+([\d.]+)\s*g/i);
  const cal = desc.match(/Calories:\s*([\d.]+)\s*kcal/i);
  const fat = desc.match(/Fat:\s*([\d.]+)\s*g/i);
  const carb = desc.match(/Carbs:\s*([\d.]+)\s*g/i);
  const prot = desc.match(/Protein:\s*([\d.]+)\s*g/i);
  if (!g || !cal || !fat || !carb || !prot) return null;
  const grams = parseFloat(g[1]);
  const calories = parseFloat(cal[1]);
  if (!Number.isFinite(grams) || !Number.isFinite(calories)) return null;
  return {
    servingId: 'desc',
    description: `${grams} g`,
    grams,
    calories,
    protein: parseFloat(prot[1]),
    carbs: parseFloat(carb[1]),
    fat: parseFloat(fat[1]),
  };
}

function mapFood(f: RawFood): FatSecretFood | null {
  const foodId = f.food_id;
  const name = f.food_name?.trim();
  if (!foodId || !name) return null;

  const rawServings = ensureArray(f.servings?.serving);
  let servings = rawServings
    .map(mapServing)
    .filter((s): s is FatSecretServing => s !== null);

  if (servings.length === 0 && f.food_description) {
    const fallback = parseDescriptionServing(f.food_description);
    if (fallback) servings = [fallback];
  }
  if (servings.length === 0) return null;

  const images = ensureArray(f.food_images?.food_image);
  const imageUrl =
    images.find((img) => img.image_type === 'Large')?.image_url ??
    images.find((img) => img.image_type === 'Small')?.image_url ??
    images[0]?.image_url;

  return {
    foodId,
    name,
    brand: f.brand_name?.trim() || null,
    foodType: f.food_type === 'Brand' ? 'Brand' : 'Generic',
    imageUrl,
    defaultServing: servings[0],
    servings,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class FatSecretService {
  private provider: IFatSecretAuthProvider | null = null;

  constructor(private readonly config: ConfigService) {}

  private getProvider(): IFatSecretAuthProvider {
    if (this.provider) return this.provider;

    const id = this.config.get<string>('FATSECRET_CLIENT_ID');
    const secret = this.config.get<string>('FATSECRET_CLIENT_SECRET');
    if (!id || !secret) {
      throw new ServiceUnavailableException(
        'FatSecret credentials not configured',
      );
    }

    const method =
      this.config.get<string>('FATSECRET_CLIENT_AUTH_METHOD') ?? 'oauth2';
    this.provider =
      method === 'oauth1'
        ? new OAuth1AuthProvider(id, secret)
        : new OAuth2AuthProvider(id, secret);

    return this.provider;
  }

  async search(
    query: string,
    pageSize = 20,
    pageNumber = 0,
  ): Promise<FatSecretFood[]> {
    const provider = this.getProvider();
    const url = new URL(provider.searchBaseUrl);
    for (const [k, v] of Object.entries(provider.searchExtraParams))
      url.searchParams.set(k, v);
    url.searchParams.set('search_expression', query);
    url.searchParams.set('max_results', String(pageSize));
    url.searchParams.set('page_number', String(pageNumber));
    url.searchParams.set('include_food_images', 'true');
    url.searchParams.set('format', 'json');

    const { url: signedUrl, headers } = await provider.applyAuth(url);
    const res = await fetch(signedUrl.toString(), { headers });
    if (!res.ok) throw new Error(`FatSecret search failed: ${res.status}`);

    interface SearchResponseV2 {
      foods_search?: {
        results?: { food?: RawFood | RawFood[] };
      };
    }
    interface SearchResponseV1 {
      foods?: { food?: RawFood | RawFood[] };
    }

    const json = (await res.json()) as SearchResponseV1 & SearchResponseV2;
    const v1Body = json.foods;
    const v2Body = json.foods_search;
    const raw =
      provider.version === 'v1'
        ? ensureArray(v1Body?.food)
        : ensureArray(v2Body?.results?.food);

    return raw.map(mapFood).filter((x): x is FatSecretFood => x !== null);
  }
}
