import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ProgressClient } from '@/app/(dashboard)/member/progress/_components/progress-client';

export default async function TrainerMemberProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();

  const member = await new MongoUserRepository().findById(memberId);
  if (!member || member.trainerId?.toString() !== session.user.id) return null;

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
      title={`${member.name}'s Progress`}
    />
  );
}
