import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

export async function GET(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  if (!startParam || !endParam) {
    return Response.json({ error: 'start and end required' }, { status: 400 });
  }

  const start = new Date(startParam);
  const end = new Date(endParam);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'invalid date' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const logs = await repo.findByUserDateRange(guard.userId, start, end);

  return Response.json(
    logs.map((l) => ({
      _id: l._id.toString(),
      dayName: l.dayName,
      startedAt: l.startedAt.toISOString(),
      completedAt: l.completedAt ? l.completedAt.toISOString() : null,
      setCount: l.sets.length,
      rpe: l.rpe,
    })),
  );
}
