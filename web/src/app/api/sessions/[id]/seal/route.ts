import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

type RouteContext = { params: Promise<{ id: string }> };

// User-initiated cross-day save for member workout sessions. Backdates
// completedAt to lastActivityAt so duration reflects actual training time.
// Same auth as /complete: member owns their own; trainer must trainer the
// member; owner: any.
export async function POST(_req: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const access = await authorizeWorkoutSessionWrite(id);
  if (!access.ok) return access.response;

  if (access.workoutSession.completedAt) {
    return Response.json(access.workoutSession);
  }

  const repo = new MongoWorkoutSessionRepository();
  const sealed = await repo.seal(id);
  return Response.json(sealed);
}
