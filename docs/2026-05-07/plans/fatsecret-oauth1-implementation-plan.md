# FatSecret OAuth 1.0 Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth 1.0 authentication to FatSecret API calls, switchable via `FATSECRET_CLIENT_AUTH_METHOD` env var (`oauth1` | `oauth2`), with a clean `IFatSecretAuthProvider` interface so neither option bleeds into the other.

**Architecture:** Define `IFatSecretAuthProvider` in its own file; implement `OAuth2AuthProvider` (token + Bearer header) and `OAuth1AuthProvider` (HMAC-SHA1 URL signing) as separate classes; replace the module-level `getFatSecretToken` in `fatsecret-auth.ts` with a singleton factory that reads the env var and returns the right provider; update `fatsecret-client.ts` to drive all requests through the provider.

**Tech Stack:** Next.js App Router · TypeScript (strict) · `node:crypto` (built-in, available in Node.js runtime) · Jest + React Testing Library · pnpm

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| **Create** | `src/lib/nutrition/fatsecret-auth-provider.ts` | `IFatSecretAuthProvider` interface — shared contract |
| **Create** | `src/lib/nutrition/fatsecret-auth-oauth2.ts` | `OAuth2AuthProvider` class (token fetch + cache) |
| **Create** | `src/lib/nutrition/fatsecret-auth-oauth1.ts` | `OAuth1AuthProvider` class (HMAC-SHA1 signing) |
| **Replace** | `src/lib/nutrition/fatsecret-auth.ts` | Singleton factory `getFatSecretAuthProvider()` |
| **Modify** | `src/lib/nutrition/fatsecret-client.ts` | Use provider instead of bare `getFatSecretToken` |
| **Replace** | `__tests__/lib/nutrition/fatsecret-auth.test.ts` | Factory tests (env var routing) |
| **Create** | `__tests__/lib/nutrition/fatsecret-auth-oauth2.test.ts` | `OAuth2AuthProvider` unit tests |
| **Create** | `__tests__/lib/nutrition/fatsecret-auth-oauth1.test.ts` | `OAuth1AuthProvider` unit tests |
| **Modify** | `__tests__/lib/nutrition/fatsecret-client.test.ts` | Update mock to use provider interface |
| **Modify** | `.env.local` | Add `FATSECRET_CLIENT_AUTH_METHOD=oauth1` |

---

## Task 1 — IFatSecretAuthProvider interface

**Files:**
- Create: `src/lib/nutrition/fatsecret-auth-provider.ts`

*No behavior, no test — pure types.*

- [ ] **Step 1: Create the interface file**

```typescript
// src/lib/nutrition/fatsecret-auth-provider.ts

export interface IFatSecretAuthProvider {
  /**
   * 'v1' = OAuth 1.0 → server.api endpoint, legacy response format
   * 'v2' = OAuth 2.0 → REST v5 endpoints, current response format
   */
  readonly version: 'v1' | 'v2';

  /** Base URL for search requests (differs between v1 and v2) */
  readonly searchBaseUrl: string;

  /** Base URL for food-get requests (differs between v1 and v2) */
  readonly foodBaseUrl: string;

  /**
   * Extra query params required by this auth method's endpoint.
   * OAuth 1.0: { method: 'foods.search' }   OAuth 2.0: {}
   */
  readonly searchExtraParams: Record<string, string>;

  /**
   * Extra query params required by this auth method's endpoint.
   * OAuth 1.0: { method: 'food.get.v4' }    OAuth 2.0: {}
   */
  readonly foodExtraParams: Record<string, string>;

  /**
   * Apply authentication to a URL.
   * - OAuth 2.0: returns { url (unchanged), headers: { Authorization: 'Bearer ...' } }
   * - OAuth 1.0: returns { url (with oauth_* + signature appended), headers: {} }
   */
  applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/eric_gong/Desktop/power_gym && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors from the new file (it's just types).

- [ ] **Step 3: Commit**

```bash
git add src/lib/nutrition/fatsecret-auth-provider.ts
git commit -m "feat(fatsecret): add IFatSecretAuthProvider interface"
```

---

## Task 2 — OAuth2AuthProvider

**Files:**
- Create: `src/lib/nutrition/fatsecret-auth-oauth2.ts`
- Create: `__tests__/lib/nutrition/fatsecret-auth-oauth2.test.ts`

*Migrate the existing token-fetch logic from `fatsecret-auth.ts` into a class.*

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/nutrition/fatsecret-auth-oauth2.test.ts
import { OAuth2AuthProvider } from '@/lib/nutrition/fatsecret-auth-oauth2';

describe('OAuth2AuthProvider', () => {
  let provider: OAuth2AuthProvider;

  beforeEach(() => {
    provider = new OAuth2AuthProvider('cid', 'csec');
    provider.__resetCache();
    global.fetch = jest.fn();
  });

  it('fetches a token and returns Bearer header on first applyAuth', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok1', expires_in: 3600 }),
    });
    const url = new URL('https://platform.fatsecret.com/rest/foods/search/v5');
    const { url: out, headers } = await provider.applyAuth(url);
    expect(headers.Authorization).toBe('Bearer tok1');
    expect(out).toBe(url); // URL is returned unchanged
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reuses cached token within expiry window', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok2', expires_in: 3600 }),
    });
    const url = new URL('https://example.com');
    await provider.applyAuth(url);
    await provider.applyAuth(url);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('concurrent applyAuth calls share one inflight fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok3', expires_in: 3600 }),
    });
    const url = new URL('https://example.com');
    const [a, b] = await Promise.all([provider.applyAuth(url), provider.applyAuth(url)]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(a.headers.Authorization).toBe('Bearer tok3');
    expect(b.headers.Authorization).toBe('Bearer tok3');
  });

  it('throws on upstream error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false, status: 401, text: async () => 'bad credentials',
    });
    await expect(provider.applyAuth(new URL('https://example.com')))
      .rejects.toThrow(/FatSecret token request failed/);
  });

  it('clears inflight on rejection so next call retries', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'fresh', expires_in: 3600 }) });

    await expect(provider.applyAuth(new URL('https://example.com'))).rejects.toThrow();
    const { headers } = await provider.applyAuth(new URL('https://example.com'));
    expect(headers.Authorization).toBe('Bearer fresh');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('exposes correct version and URLs', () => {
    expect(provider.version).toBe('v2');
    expect(provider.searchBaseUrl).toBe('https://platform.fatsecret.com/rest/foods/search/v5');
    expect(provider.foodBaseUrl).toBe('https://platform.fatsecret.com/rest/food/v5');
    expect(provider.searchExtraParams).toEqual({});
    expect(provider.foodExtraParams).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
pnpm test -- --testPathPattern=fatsecret-auth-oauth2 --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/nutrition/fatsecret-auth-oauth2'`

- [ ] **Step 3: Implement OAuth2AuthProvider**

```typescript
// src/lib/nutrition/fatsecret-auth-oauth2.ts
import type { IFatSecretAuthProvider } from './fatsecret-auth-provider';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const SAFETY_MARGIN_MS = 60_000;

export class OAuth2AuthProvider implements IFatSecretAuthProvider {
  readonly version = 'v2' as const;
  readonly searchBaseUrl = 'https://platform.fatsecret.com/rest/foods/search/v5';
  readonly foodBaseUrl = 'https://platform.fatsecret.com/rest/food/v5';
  readonly searchExtraParams: Record<string, string> = {};
  readonly foodExtraParams: Record<string, string> = {};

  private cached: { token: string; expiresAt: number } | null = null;
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }> {
    const token = await this.getToken();
    return { url, headers: { Authorization: `Bearer ${token}` } };
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now + SAFETY_MARGIN_MS) return this.cached.token;
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchToken().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' });
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`FatSecret token request failed: ${res.status} ${detail}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  __resetCache(): void {
    this.cached = null;
    this.inflight = null;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- --testPathPattern=fatsecret-auth-oauth2 --no-coverage
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/fatsecret-auth-oauth2.ts __tests__/lib/nutrition/fatsecret-auth-oauth2.test.ts
git commit -m "feat(fatsecret): implement OAuth2AuthProvider"
```

---

## Task 3 — OAuth1AuthProvider

**Files:**
- Create: `src/lib/nutrition/fatsecret-auth-oauth1.ts`
- Create: `__tests__/lib/nutrition/fatsecret-auth-oauth1.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/nutrition/fatsecret-auth-oauth1.test.ts
import { OAuth1AuthProvider } from '@/lib/nutrition/fatsecret-auth-oauth1';

describe('OAuth1AuthProvider', () => {
  const fixed = new OAuth1AuthProvider(
    'test_key',
    'test_secret',
    () => 1_000_000_000,       // fixed clock
    () => 'fixed_nonce_abc12', // fixed nonce
  );

  function makeUrl(extra: Record<string, string> = {}): URL {
    const url = new URL('https://platform.fatsecret.com/rest/server.api');
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return url;
  }

  it('returns empty headers (auth is in URL params)', async () => {
    const { headers } = await fixed.applyAuth(makeUrl({ method: 'foods.search' }));
    expect(headers).toEqual({});
  });

  it('includes all required oauth parameters in signed URL', async () => {
    const { url } = await fixed.applyAuth(makeUrl({ method: 'foods.search' }));
    expect(url.searchParams.get('oauth_consumer_key')).toBe('test_key');
    expect(url.searchParams.get('oauth_signature_method')).toBe('HMAC-SHA1');
    expect(url.searchParams.get('oauth_version')).toBe('1.0');
    expect(url.searchParams.get('oauth_nonce')).toBe('fixed_nonce_abc12');
    expect(url.searchParams.get('oauth_timestamp')).toBe('1000000000');
    expect(url.searchParams.get('oauth_signature')).toBeTruthy();
  });

  it('preserves original query params in signed URL', async () => {
    const { url } = await fixed.applyAuth(
      makeUrl({ method: 'foods.search', search_expression: 'chicken', max_results: '5' }),
    );
    expect(url.searchParams.get('method')).toBe('foods.search');
    expect(url.searchParams.get('search_expression')).toBe('chicken');
    expect(url.searchParams.get('max_results')).toBe('5');
  });

  it('signature is valid 20-byte SHA1 (base64)', async () => {
    const { url } = await fixed.applyAuth(makeUrl({ method: 'foods.search' }));
    const sig = url.searchParams.get('oauth_signature')!;
    expect(Buffer.from(sig, 'base64')).toHaveLength(20);
  });

  it('signature is deterministic given same clock and nonce', async () => {
    const { url: a } = await fixed.applyAuth(makeUrl({ method: 'foods.search', search_expression: 'apple' }));
    const { url: b } = await fixed.applyAuth(makeUrl({ method: 'foods.search', search_expression: 'apple' }));
    expect(a.searchParams.get('oauth_signature')).toBe(b.searchParams.get('oauth_signature'));
  });

  it('different params produce different signatures', async () => {
    const { url: a } = await fixed.applyAuth(makeUrl({ method: 'foods.search', search_expression: 'apple' }));
    const { url: b } = await fixed.applyAuth(makeUrl({ method: 'foods.search', search_expression: 'banana' }));
    expect(a.searchParams.get('oauth_signature')).not.toBe(b.searchParams.get('oauth_signature'));
  });

  it('exposes correct version, URLs, and extra params', () => {
    const p = new OAuth1AuthProvider('k', 's');
    expect(p.version).toBe('v1');
    expect(p.searchBaseUrl).toBe('https://platform.fatsecret.com/rest/server.api');
    expect(p.foodBaseUrl).toBe('https://platform.fatsecret.com/rest/server.api');
    expect(p.searchExtraParams).toEqual({ method: 'foods.search' });
    expect(p.foodExtraParams).toEqual({ method: 'food.get.v4' });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
pnpm test -- --testPathPattern=fatsecret-auth-oauth1 --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/nutrition/fatsecret-auth-oauth1'`

- [ ] **Step 3: Implement OAuth1AuthProvider**

```typescript
// src/lib/nutrition/fatsecret-auth-oauth1.ts
import { createHmac, randomBytes } from 'node:crypto';
import type { IFatSecretAuthProvider } from './fatsecret-auth-provider';

export class OAuth1AuthProvider implements IFatSecretAuthProvider {
  readonly version = 'v1' as const;
  readonly searchBaseUrl = 'https://platform.fatsecret.com/rest/server.api';
  readonly foodBaseUrl = 'https://platform.fatsecret.com/rest/server.api';
  readonly searchExtraParams = { method: 'foods.search' };
  readonly foodExtraParams = { method: 'food.get.v4' };

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly clock: () => number = () => Math.floor(Date.now() / 1000),
    private readonly nonceGen: () => string = () => randomBytes(8).toString('hex'),
  ) {}

  async applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }> {
    const timestamp = String(this.clock());
    const nonce = this.nonceGen();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.clientId,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
    };

    // Merge existing URL params with oauth params (no signature yet)
    const allParams: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { allParams[k] = v; });
    Object.assign(allParams, oauthParams);

    const pe = (s: string) => encodeURIComponent(s);
    const sorted = Object.entries(allParams).sort(([a], [b]) => a.localeCompare(b));
    const paramString = sorted.map(([k, v]) => `${pe(k)}=${pe(v)}`).join('&');
    const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
    const baseString = `GET&${pe(baseUrl)}&${pe(paramString)}`;
    const signingKey = `${pe(this.clientSecret)}&`;
    const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

    const signedUrl = new URL(baseUrl);
    for (const [k, v] of sorted) signedUrl.searchParams.set(k, v);
    signedUrl.searchParams.set('oauth_signature', signature);

    return { url: signedUrl, headers: {} };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- --testPathPattern=fatsecret-auth-oauth1 --no-coverage
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/fatsecret-auth-oauth1.ts __tests__/lib/nutrition/fatsecret-auth-oauth1.test.ts
git commit -m "feat(fatsecret): implement OAuth1AuthProvider with HMAC-SHA1 signing"
```

---

## Task 4 — Factory + update fatsecret-auth.ts

**Files:**
- Replace: `src/lib/nutrition/fatsecret-auth.ts`
- Replace: `__tests__/lib/nutrition/fatsecret-auth.test.ts`

*The existing `fatsecret-auth.test.ts` tested `getFatSecretToken` directly — replace with factory routing tests.*

- [ ] **Step 1: Write the failing factory tests**

Replace the entire content of `__tests__/lib/nutrition/fatsecret-auth.test.ts`:

```typescript
// __tests__/lib/nutrition/fatsecret-auth.test.ts
import { getFatSecretAuthProvider, __resetProviderCache } from '@/lib/nutrition/fatsecret-auth';
import { OAuth2AuthProvider } from '@/lib/nutrition/fatsecret-auth-oauth2';
import { OAuth1AuthProvider } from '@/lib/nutrition/fatsecret-auth-oauth1';

describe('getFatSecretAuthProvider', () => {
  beforeEach(() => {
    __resetProviderCache();
    process.env.FATSECRET_CLIENT_ID = 'cid';
    process.env.FATSECRET_CLIENT_SECRET = 'csec';
    delete process.env.FATSECRET_CLIENT_AUTH_METHOD;
  });

  afterEach(() => {
    __resetProviderCache();
    delete process.env.FATSECRET_CLIENT_ID;
    delete process.env.FATSECRET_CLIENT_SECRET;
    delete process.env.FATSECRET_CLIENT_AUTH_METHOD;
  });

  it('throws when FATSECRET_CLIENT_ID is missing', () => {
    delete process.env.FATSECRET_CLIENT_ID;
    expect(() => getFatSecretAuthProvider()).toThrow(/FATSECRET_CLIENT_ID/);
  });

  it('throws when FATSECRET_CLIENT_SECRET is missing', () => {
    delete process.env.FATSECRET_CLIENT_SECRET;
    expect(() => getFatSecretAuthProvider()).toThrow(/FATSECRET_CLIENT_SECRET/);
  });

  it('returns OAuth2AuthProvider by default (no env var set)', () => {
    const p = getFatSecretAuthProvider();
    expect(p).toBeInstanceOf(OAuth2AuthProvider);
  });

  it('returns OAuth2AuthProvider when FATSECRET_CLIENT_AUTH_METHOD=oauth2', () => {
    process.env.FATSECRET_CLIENT_AUTH_METHOD = 'oauth2';
    const p = getFatSecretAuthProvider();
    expect(p).toBeInstanceOf(OAuth2AuthProvider);
  });

  it('returns OAuth1AuthProvider when FATSECRET_CLIENT_AUTH_METHOD=oauth1', () => {
    process.env.FATSECRET_CLIENT_AUTH_METHOD = 'oauth1';
    const p = getFatSecretAuthProvider();
    expect(p).toBeInstanceOf(OAuth1AuthProvider);
  });

  it('returns the same singleton instance on repeated calls', () => {
    const a = getFatSecretAuthProvider();
    const b = getFatSecretAuthProvider();
    expect(a).toBe(b);
  });

  it('creates a fresh instance after __resetProviderCache', () => {
    const a = getFatSecretAuthProvider();
    __resetProviderCache();
    const b = getFatSecretAuthProvider();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test -- --testPathPattern="__tests__/lib/nutrition/fatsecret-auth.test" --no-coverage
```

Expected: FAIL — `getFatSecretAuthProvider` not exported from `fatsecret-auth`.

- [ ] **Step 3: Replace fatsecret-auth.ts with the factory**

```typescript
// src/lib/nutrition/fatsecret-auth.ts
import type { IFatSecretAuthProvider } from './fatsecret-auth-provider';
import { OAuth2AuthProvider } from './fatsecret-auth-oauth2';
import { OAuth1AuthProvider } from './fatsecret-auth-oauth1';

let _provider: IFatSecretAuthProvider | null = null;

export function getFatSecretAuthProvider(): IFatSecretAuthProvider {
  if (_provider) return _provider;

  const id = process.env.FATSECRET_CLIENT_ID;
  const secret = process.env.FATSECRET_CLIENT_SECRET;
  if (!id) throw new Error('FATSECRET_CLIENT_ID is not set');
  if (!secret) throw new Error('FATSECRET_CLIENT_SECRET is not set');

  const method = process.env.FATSECRET_CLIENT_AUTH_METHOD ?? 'oauth2';
  _provider = method === 'oauth1'
    ? new OAuth1AuthProvider(id, secret)
    : new OAuth2AuthProvider(id, secret);

  return _provider;
}

export function __resetProviderCache(): void {
  _provider = null;
}
```

- [ ] **Step 4: Run factory tests — expect PASS**

```bash
pnpm test -- --testPathPattern="__tests__/lib/nutrition/fatsecret-auth.test" --no-coverage
```

Expected: 7 tests pass.

- [ ] **Step 5: Confirm OAuth2 and OAuth1 tests still pass**

```bash
pnpm test -- --testPathPattern="fatsecret-auth" --no-coverage
```

Expected: all 3 test files pass (fatsecret-auth, fatsecret-auth-oauth2, fatsecret-auth-oauth1).

- [ ] **Step 6: Commit**

```bash
git add src/lib/nutrition/fatsecret-auth.ts __tests__/lib/nutrition/fatsecret-auth.test.ts
git commit -m "feat(fatsecret): replace getFatSecretToken with getFatSecretAuthProvider factory"
```

---

## Task 5 — Update fatsecret-client.ts

**Files:**
- Modify: `src/lib/nutrition/fatsecret-client.ts`
- Modify: `__tests__/lib/nutrition/fatsecret-client.test.ts`

*The client gains a second search-response parser for the OAuth 1.0 legacy format (`foods.food[]` vs `foods_search.results.food[]`). Food-get response format is identical for both auth methods — no change there.*

- [ ] **Step 1: Update fatsecret-client.test.ts mock**

Replace the `jest.mock` block and add a `getFatSecretAuthProvider` import at the top. The existing test cases do not need to change — only the mock shape changes.

Full updated header of `__tests__/lib/nutrition/fatsecret-client.test.ts`:

```typescript
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
  });
  // ... rest of the existing tests unchanged ...
```

Keep all existing `it(...)` blocks exactly as they are — they still work because the response shapes haven't changed for the v2 mock provider.

- [ ] **Step 2: Run client tests — expect FAIL**

```bash
pnpm test -- --testPathPattern=fatsecret-client --no-coverage
```

Expected: FAIL — client still imports `getFatSecretToken`.

- [ ] **Step 3: Update fatsecret-client.ts**

Replace the full file:

```typescript
// src/lib/nutrition/fatsecret-client.ts
import { getFatSecretAuthProvider } from './fatsecret-auth';

const CACHE_MAX = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;

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
    grams, calories, protein, carbs, fat,
  };
  const fiber = num(s.fiber); if (fiber !== undefined) out.fiber = fiber;
  const sugar = num(s.sugar); if (sugar !== undefined) out.sugar = sugar;
  const sat = num(s.saturated_fat); if (sat !== undefined) out.saturated = sat;
  const poly = num(s.polyunsaturated_fat); if (poly !== undefined) out.polyunsaturated = poly;
  const mono = num(s.monounsaturated_fat); if (mono !== undefined) out.monounsaturated = mono;
  const chol = num(s.cholesterol); if (chol !== undefined) out.cholesterol = chol;
  const sod = num(s.sodium); if (sod !== undefined) out.sodium = sod;
  const pot = num(s.potassium); if (pot !== undefined) out.potassium = pot;
  const trans = num(s.trans_fat); if (trans !== undefined) out.transFat = trans;
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
    foodId, name,
    brand: f.brand_name?.trim() || null,
    foodType: f.food_type === 'Brand' ? 'Brand' : 'Generic',
    defaultServing: servings[0],
    servings,
  };
}

// OAuth 2.0 v5 response shape
interface SearchResponseV2 {
  foods_search?: { results?: { food?: RawFood | RawFood[] } };
}

// OAuth 1.0 server.api response shape
interface SearchResponseV1 {
  foods?: { food?: RawFood | RawFood[] };
}

interface GetFoodResponse {
  food?: RawFood | null;
}

export async function fatsecretSearch(query: string, pageSize = 20): Promise<FatSecretFood[]> {
  const key = `${query.toLowerCase()}::${pageSize}`;
  const hit = searchCache.get(key);
  if (hit && hit.expires > Date.now()) {
    searchCache.delete(key);
    searchCache.set(key, hit);
    return hit.data;
  }

  const provider = getFatSecretAuthProvider();
  const url = new URL(provider.searchBaseUrl);
  for (const [k, v] of Object.entries(provider.searchExtraParams)) url.searchParams.set(k, v);
  url.searchParams.set('search_expression', query);
  url.searchParams.set('max_results', String(pageSize));
  url.searchParams.set('format', 'json');

  const { url: signedUrl, headers } = await provider.applyAuth(url);
  const res = await fetch(signedUrl.toString(), { headers });
  if (!res.ok) throw new Error(`FatSecret search failed: ${res.status}`);

  const json = await res.json();
  const raw = provider.version === 'v1'
    ? ensureArray((json as SearchResponseV1).foods?.food)
    : ensureArray((json as SearchResponseV2).foods_search?.results?.food);

  const data = raw.map(mapFood).filter((x): x is FatSecretFood => x !== null);

  if (searchCache.size >= CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

export async function fatsecretGetFood(foodId: string): Promise<FatSecretFood> {
  const provider = getFatSecretAuthProvider();
  const url = new URL(provider.foodBaseUrl);
  for (const [k, v] of Object.entries(provider.foodExtraParams)) url.searchParams.set(k, v);
  url.searchParams.set('food_id', foodId);
  url.searchParams.set('format', 'json');

  const { url: signedUrl, headers } = await provider.applyAuth(url);
  const res = await fetch(signedUrl.toString(), { headers });
  if (!res.ok) throw new Error(`FatSecret get-food failed: ${res.status}`);

  const json = (await res.json()) as GetFoodResponse;
  const food = json.food ? mapFood(json.food) : null;
  if (!food) throw new Error(`FatSecret returned invalid food ${foodId}`);
  return food;
}

export function __resetSearchCache(): void {
  searchCache.clear();
}
```

- [ ] **Step 4: Run all fatsecret tests — expect all PASS**

```bash
pnpm test -- --testPathPattern="fatsecret" --no-coverage
```

Expected: all 4 test files pass (fatsecret-auth, fatsecret-auth-oauth2, fatsecret-auth-oauth1, fatsecret-client).

- [ ] **Step 5: Run full test suite**

```bash
pnpm test --no-coverage
```

Expected: 100% pass rate.

- [ ] **Step 6: Lint**

```bash
pnpm lint
```

Expected: no errors, no warnings.

- [ ] **Step 7: Commit**

```bash
git add src/lib/nutrition/fatsecret-client.ts __tests__/lib/nutrition/fatsecret-client.test.ts
git commit -m "feat(fatsecret): update client to use IFatSecretAuthProvider; support OAuth1 response format"
```

---

## Task 6 — Wire .env.local and verify

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add auth method to .env.local**

Add this line to `.env.local`:
```
FATSECRET_CLIENT_AUTH_METHOD=oauth1
```

- [ ] **Step 2: Start dev server and make a live search request**

```bash
# Terminal 1
pnpm dev

# Terminal 2 — get a session cookie first, then:
curl -s "http://localhost:3000/api/food-search?q=chicken" \
  -H "Cookie: <your-session-cookie>" | jq '.results | length'
```

Expected: a number > 0 (e.g. 20).

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore(env): set FATSECRET_CLIENT_AUTH_METHOD=oauth1"
```

---

## Done

All tests pass, lint clean, OAuth 1.0 active. To switch back to OAuth 2.0 once IP whitelist propagates, change `.env.local`:
```
FATSECRET_CLIENT_AUTH_METHOD=oauth2
```
