import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import dynamic from 'next/dynamic';
const MemberStrengthSelectorClient = dynamic(
  () => import('./member-strength-selector-client').then((m) => m.MemberStrengthSelectorClient),
  { ssr: false },
);

export async function MemberStrengthSelector() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoWorkoutSessionRepository();
  const exercises = await repo.findTrainedExercises(session.user.id);

  return <MemberStrengthSelectorClient exercises={exercises} memberId={session.user.id} />;
}
