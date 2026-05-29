interface AuthResponse {
  access_token: string;
  user: { id: string; email: string; role: 'owner' | 'trainer' | 'member'; name: string };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid email or password.');
  return res.json() as Promise<AuthResponse>;
}

export async function refresh(): Promise<AuthResponse> {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json() as Promise<AuthResponse>;
}

export async function logout(): Promise<void> {
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  token?: string;
}): Promise<AuthResponse> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json() as Promise<AuthResponse>;
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Failed');
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) throw new Error('Reset failed');
}
