import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MemberHeatmapClient } from './member-heatmap-client';

export async function MemberHeatmap() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const completedDates = await repo.findCompletedDates(session.user.id, since);
  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return <MemberHeatmapClient heatmapData={heatmapData} />;
}
