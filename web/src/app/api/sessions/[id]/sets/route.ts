import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const access = await authorizeWorkoutSessionWrite(id);
  if (!access.ok) return access.response;

  const { workoutSession } = access;
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as {
    exerciseId: string;
    exerciseName?: string;
    prescribedRepsMin: number;
    prescribedRepsMax: number;
  };

  const exerciseOId = new mongoose.Types.ObjectId(body.exerciseId);
  const existingSets = workoutSession.sets.filter(
    (s) => s.exerciseId.toString() === body.exerciseId,
  );

  let extraSet;
  if (existingSets.length === 0) {
    if (!body.exerciseName) {
      return Response.json(
        { error: 'exerciseName required for new exercise' },
        { status: 400 },
      );
    }
    extraSet = {
      exerciseId: exerciseOId,
      exerciseName: body.exerciseName,
      groupId: body.exerciseId,
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: body.prescribedRepsMin,
      prescribedRepsMax: body.prescribedRepsMax,
      isExtraSet: true,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
  } else {
    const ref = existingSets[0];
    const nextSetNumber = Math.max(...existingSets.map((s) => s.setNumber)) + 1;
    extraSet = {
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
  }

  const repo = new MongoWorkoutSessionRepository();
  const updated = await repo.addExtraSet(id, extraSet);
  return Response.json(updated, { status: 201 });
}
