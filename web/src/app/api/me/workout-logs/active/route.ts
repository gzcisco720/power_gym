import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

export async function GET(): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.findActive(guard.userId);
  return Response.json(log);
}
