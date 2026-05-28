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
