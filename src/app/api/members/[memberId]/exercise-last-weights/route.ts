import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const exerciseIdsParam = searchParams.get('exerciseIds');
  if (!exerciseIdsParam) return Response.json({ hints: [] });

  const exerciseIds = exerciseIdsParam.split(',').filter(Boolean);
  if (exerciseIds.length === 0) return Response.json({ hints: [] });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const repo = new MongoWorkoutSessionRepository();
  const hints = await repo.findLastWeightsForExercises(memberId, exerciseIds);

  return Response.json({
    hints: hints.map((h) => ({
      exerciseId: h.exerciseId,
      lastWeight: h.lastWeight,
      lastReps: h.lastReps,
      lastDate: h.lastDate.toISOString(),
      consecutiveMaxHits: h.consecutiveMaxHits,
    })),
  });
}
