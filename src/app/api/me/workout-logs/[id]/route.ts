import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.findById(id, guard.userId);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const ok = await repo.delete(id, guard.userId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
