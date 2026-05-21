import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MemberHeatmapClient } from '@/app/(dashboard)/member/_components/member-heatmap-client';

export async function TrainingFrequencySection({ memberId }: { memberId: string }) {
  await connectDB();
  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const completedDates = await repo.findCompletedDates(memberId, since);
  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return <MemberHeatmapClient heatmapData={heatmapData} />;
}
