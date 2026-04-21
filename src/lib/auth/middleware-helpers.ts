import type { UserRole } from '@/types/auth';

const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  owner: ['/dashboard/owner', '/dashboard/trainer', '/dashboard/member'],
  trainer: ['/dashboard/trainer', '/dashboard/member'],
  member: ['/dashboard/member'],
};

export function getRedirectForRole(role: UserRole, path: string): string | null {
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  const isAllowed = allowed.some((prefix) => path.startsWith(prefix));
  if (isAllowed) return null;
  return `/dashboard/${role}`;
}
