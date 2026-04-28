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
  const exerciseId = searchParams.get('exerciseId');
  if (!exerciseId) return Response.json({ error: 'exerciseId is required' }, { status: 400 });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const history = await new MongoWorkoutSessionRepository().findExerciseHistory(memberId, exerciseId);

  return Response.json({
    history: history.map((h) => ({
      date: h.date.toISOString().split('T')[0],
      estimatedOneRM: h.estimatedOneRM,
    })),
  });
}
