import { useAuthStore } from '@/stores/authStore';

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, credentials: 'include', headers });

  if (res.status !== 401) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  // 401 — try one silent refresh
  const newToken = await useAuthStore.getState().refresh();
  if (!newToken) {
    throw new Error('Session expired');
  }

  headers['Authorization'] = `Bearer ${newToken}`;
  const retry = await fetch(url, { ...options, credentials: 'include', headers });
  if (!retry.ok) throw new Error(`Request failed: ${retry.status}`);
  return retry.json() as Promise<T>;
}
