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
