import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { ProgressClient } from './progress-client';

interface Props {
  memberId: string;
  title?: string;
}

export async function ProgressContent({ memberId, title }: Props) {
  await connectDB();
  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [completedDates, exercises] = await Promise.all([
    repo.findCompletedDates(memberId, since),
    repo.findTrainedExercises(memberId),
  ]);

  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return (
    <ProgressClient
      heatmapData={heatmapData}
      exercises={exercises}
      memberId={memberId}
      title={title}
    />
  );
}
