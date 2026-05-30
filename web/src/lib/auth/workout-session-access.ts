import { auth } from './auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { IWorkoutSession } from '@/lib/db/models/workout-session.model';

type AccessResult =
  | { ok: true; workoutSession: IWorkoutSession; memberId: string; loggedBy: string | null }
  | { ok: false; response: Response };

/**
 * Authorize a write to a workout session. Returns the session document plus
 * `loggedBy` (the actor's id when they're not the member themselves, otherwise null)
 * so callers can record on-behalf-of edits without re-querying.
 *
 * Member: only their own sessions. Trainer: only sessions of members assigned
 * to them. Owner: any session.
 */
export async function authorizeWorkoutSessionWrite(id: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  await connectDB();
  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);
  if (!workoutSession) {
    return { ok: false, response: Response.json({ error: 'Not found' }, { status: 404 }) };
  }

  const role = session.user.role as UserRole;
  const memberId = workoutSession.memberId.toString();
  const isSelf = memberId === session.user.id;

  if (role === 'member' && !isSelf) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  if (role === 'trainer' && !isSelf) {
    const userRepo = new MongoUserRepository();
    const member = await userRepo.findById(memberId);
    if (!member || member.trainerId?.toString() !== session.user.id) {
      return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  return { ok: true, workoutSession, memberId, loggedBy: isSelf ? null : session.user.id };
}
