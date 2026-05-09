import { connectDB } from '@/lib/db/connect';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

const STALE_AFTER_HOURS = 24;

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const selfRepo = new MongoSelfWorkoutLogRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const [staleSelf, staleSessions] = await Promise.all([
    selfRepo.findStaleActive(STALE_AFTER_HOURS),
    sessionRepo.findStaleActive(STALE_AFTER_HOURS),
  ]);

  let selfWorkoutLogs = 0;
  for (const log of staleSelf) {
    const result = await selfRepo.autoSeal(log._id.toString());
    if (result?.autoSealed) selfWorkoutLogs++;
  }

  let workoutSessions = 0;
  for (const sess of staleSessions) {
    const result = await sessionRepo.autoSeal(sess._id.toString());
    if (result?.autoSealed) workoutSessions++;
  }

  return Response.json({ sealed: { selfWorkoutLogs, workoutSessions } });
}
