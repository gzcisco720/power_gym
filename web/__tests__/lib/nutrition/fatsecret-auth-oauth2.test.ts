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
