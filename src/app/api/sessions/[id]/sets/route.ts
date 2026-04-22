import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);
  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  if (workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as {
    exerciseId: string;
    prescribedRepsMin: number;
    prescribedRepsMax: number;
  };

  const exerciseOId = new mongoose.Types.ObjectId(body.exerciseId);
  const existingSets = workoutSession.sets.filter(
    (s) => s.exerciseId.toString() === body.exerciseId,
  );
  const ref = existingSets[0];
  if (!ref) return Response.json({ error: 'Exercise not found in session' }, { status: 404 });

  const nextSetNumber = Math.max(...existingSets.map((s) => s.setNumber)) + 1;

  const extraSet = {
    exerciseId: exerciseOId,
    exerciseName: ref.exerciseName,
    groupId: ref.groupId,
    isSuperset: ref.isSuperset,
    isBodyweight: ref.isBodyweight,
    setNumber: nextSetNumber,
    prescribedRepsMin: body.prescribedRepsMin,
    prescribedRepsMax: body.prescribedRepsMax,
    isExtraSet: true,
    actualWeight: null,
    actualReps: null,
    completedAt: null,
  };

  const updated = await repo.addExtraSet(id, extraSet);
  return Response.json(updated, { status: 201 });
}
