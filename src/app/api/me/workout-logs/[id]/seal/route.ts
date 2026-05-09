import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string }> };

// User-initiated cross-day save: backdate completedAt to lastActivityAt and
// leave autoSealed=false. Used by the cockpit's cross-day prompt when the
// user clicks "Save it".
export async function POST(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.seal(id, guard.userId);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
