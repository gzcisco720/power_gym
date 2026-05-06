const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const SAFETY_MARGIN_MS = 60_000; // refresh 1min before actual expiry

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;
let inflight: Promise<string> | null = null;

export async function getFatSecretToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + SAFETY_MARGIN_MS) return cached.token;
  if (inflight) return inflight;

  inflight = fetchToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function fetchToken(): Promise<string> {
  const id = process.env.FATSECRET_CLIENT_ID;
  const secret = process.env.FATSECRET_CLIENT_SECRET;
  if (!id) throw new Error('FATSECRET_CLIENT_ID is not set');
  if (!secret) throw new Error('FATSECRET_CLIENT_SECRET is not set');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'basic',
  });
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`FatSecret token request failed: ${res.status} ${detail}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export function __resetTokenCache(): void {
  cached = null;
  inflight = null;
}
