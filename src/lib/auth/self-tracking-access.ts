import { auth } from '@/lib/auth/auth';
import type { UserRole } from '@/types/auth';

export type SelfTrackingAuthResult =
  | { ok: true; userId: string; role: 'owner' | 'trainer' }
  | { ok: false; response: Response };

export async function requireSelfTrackingRole(): Promise<SelfTrackingAuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = session.user.role as UserRole;
  if (role !== 'owner' && role !== 'trainer') {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id, role };
}
