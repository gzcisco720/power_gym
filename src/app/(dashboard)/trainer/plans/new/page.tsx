import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { NewPlanClient } from './_client';

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  return <NewPlanClient exercises={JSON.parse(JSON.stringify(exercises))} backPath="/trainer/plans" />;
}
