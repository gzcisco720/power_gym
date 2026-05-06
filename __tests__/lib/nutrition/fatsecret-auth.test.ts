import { getFatSecretToken, __resetTokenCache } from '@/lib/nutrition/fatsecret-auth';

describe('getFatSecretToken', () => {
  beforeEach(() => {
    __resetTokenCache();
    global.fetch = jest.fn();
    process.env.FATSECRET_CLIENT_ID = 'cid';
    process.env.FATSECRET_CLIENT_SECRET = 'csec';
  });

  it('fetches a token on first call', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 3600 }),
    });
    const t = await getFatSecretToken();
    expect(t).toBe('tok');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reuses cached token within expiry window', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 3600 }),
    });
    await getFatSecretToken();
    await getFatSecretToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws when env vars missing', async () => {
    delete process.env.FATSECRET_CLIENT_ID;
    await expect(getFatSecretToken()).rejects.toThrow(/FATSECRET_CLIENT_ID/);
  });

  it('throws on upstream error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401, text: async () => '' });
    await expect(getFatSecretToken()).rejects.toThrow(/FatSecret token request failed/);
  });

  it('rejects all concurrent callers when token fetch fails, without leaving stale inflight', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' });
    const [a, b] = await Promise.allSettled([getFatSecretToken(), getFatSecretToken()]);
    expect(a.status).toBe('rejected');
    expect(b.status).toBe('rejected');
    expect(global.fetch).toHaveBeenCalledTimes(1); // both callers shared the same inflight

    // After rejection, a fresh call should retry (not be stuck on the rejected inflight)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fresh', expires_in: 3600 }),
    });
    const t = await getFatSecretToken();
    expect(t).toBe('fresh');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
