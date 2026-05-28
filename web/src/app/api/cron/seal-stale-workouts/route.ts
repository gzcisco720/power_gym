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

  const [selfResults, sessionResults] = await Promise.all([
    Promise.all(staleSelf.map((log) => selfRepo.autoSeal(log._id.toString()))),
    Promise.all(staleSessions.map((sess) => sessionRepo.autoSeal(sess._id.toString()))),
  ]);
  const selfWorkoutLogs = selfResults.filter((r) => r?.autoSealed).length;
  const workoutSessions = sessionResults.filter((r) => r?.autoSealed).length;

  return Response.json({ sealed: { selfWorkoutLogs, workoutSessions } });
}
