import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const access = await authorizeWorkoutSessionWrite(id);
  if (!access.ok) return access.response;

  if (access.workoutSession.completedAt) {
    return Response.json({ error: 'Already completed' }, { status: 409 });
  }

  let body: { rpe?: number; memberNote?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const repo = new MongoWorkoutSessionRepository();
  const completed = await repo.complete(id, { rpe: body.rpe, memberNote: body.memberNote });
  return Response.json(completed);
}
