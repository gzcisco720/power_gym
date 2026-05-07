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
