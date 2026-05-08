import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string; setIndex: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id, setIndex } = await params;
  const idx = parseInt(setIndex, 10);
  const body = (await req.json()) as { actualWeight: number | null; actualReps: number | null };

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.updateSet(id, guard.userId, idx, {
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
  });
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
