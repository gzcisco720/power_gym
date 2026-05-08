import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { getPresetPlan } from '@/lib/training/preset-plans';
import { NewPlanClient } from '@/app/(dashboard)/trainer/plans/new/_client';

export default async function OwnerNewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  const { preset } = await searchParams;
  const presetPlan = preset ? getPresetPlan(preset) : null;
  return (
    <NewPlanClient
      exercises={JSON.parse(JSON.stringify(exercises))}
      backPath="/owner/plans"
      presetPlan={presetPlan}
    />
  );
}
