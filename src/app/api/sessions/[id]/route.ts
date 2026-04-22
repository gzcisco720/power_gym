import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);

  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  const role = session.user.role as UserRole;
  if (role === 'member' && workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return Response.json(workoutSession);
}
