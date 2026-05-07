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
