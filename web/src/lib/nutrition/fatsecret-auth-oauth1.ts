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
