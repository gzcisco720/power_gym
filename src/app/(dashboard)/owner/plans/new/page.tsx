import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { NewPlanClient } from '@/app/(dashboard)/trainer/plans/new/_client';

export default async function OwnerNewPlanPage() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  return <NewPlanClient exercises={JSON.parse(JSON.stringify(exercises))} backPath="/owner/plans" />;
}
