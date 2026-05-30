/**
 * Backend API helpers for E2E tests.
 * Used when a test needs a valid access token directly (e.g. to make
 * authenticated API assertions without going through the browser).
 */

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: 'owner' | 'trainer' | 'member';
    name: string;
  };
}

type TestRole = 'owner' | 'trainer' | 'member';

const CREDENTIALS: Record<TestRole, { email: string; password: string }> = {
  owner: { email: 'owner@test.com', password: 'TestPass123!' },
  trainer: { email: 'trainer@test.com', password: 'TestPass123!' },
  member: { email: 'member@test.com', password: 'TestPass123!' },
};

/**
 * Logs in as the given role via the backend API and returns the access token.
 * The token decodes to the expected role.
 */
export async function loginAs(role: TestRole): Promise<string> {
  const { email, password } = CREDENTIALS[role];
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`loginAs(${role}) failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LoginResponse;
  return data.access_token;
}
