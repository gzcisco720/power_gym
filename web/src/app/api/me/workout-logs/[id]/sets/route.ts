import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json()) as ISelfWorkoutSet;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.appendSet(id, guard.userId, body);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
