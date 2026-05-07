import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';

type RouteContext = { params: Promise<{ id: string; setIndex: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const { id, setIndex } = await params;
  const idx = parseInt(setIndex, 10);

  const access = await authorizeWorkoutSessionWrite(id);
  if (!access.ok) return access.response;

  const { workoutSession, memberId } = access;
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as { actualWeight: number | null; actualReps: number | null };
  const repo = new MongoWorkoutSessionRepository();
  const updated = await repo.updateSet(id, idx, {
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
  });

  const targetSet = workoutSession.sets[idx];
  if (body.actualWeight !== null && body.actualReps !== null && !targetSet.isBodyweight) {
    const pbRepo = new MongoPersonalBestRepository();
    await pbRepo.upsertIfBetter({
      memberId,
      exerciseId: targetSet.exerciseId.toString(),
      exerciseName: targetSet.exerciseName,
      weight: body.actualWeight,
      reps: body.actualReps,
      sessionId: id,
    });
  }

  return Response.json(updated);
}
