import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';

type RouteContext = { params: Promise<{ id: string; setIndex: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id, setIndex } = await params;
  const idx = parseInt(setIndex, 10);

  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);
  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  if (workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as { actualWeight: number | null; actualReps: number | null };
  const updated = await repo.updateSet(id, idx, {
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
  });

  const targetSet = workoutSession.sets[idx];
  if (body.actualWeight !== null && body.actualReps !== null && !targetSet.isBodyweight) {
    const pbRepo = new MongoPersonalBestRepository();
    await pbRepo.upsertIfBetter({
      memberId: session.user.id,
      exerciseId: targetSet.exerciseId.toString(),
      exerciseName: targetSet.exerciseName,
      weight: body.actualWeight,
      reps: body.actualReps,
      sessionId: id,
    });
  }

  return Response.json(updated);
}
