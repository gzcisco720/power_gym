import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { SessionLogger } from './_components/session-logger';
import { notFound } from 'next/navigation';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();
  const workoutSession = await new MongoWorkoutSessionRepository().findById(id);

  if (!workoutSession) notFound();
  if (workoutSession.memberId.toString() !== session.user.id) notFound();

  return (
    <SessionLogger session={JSON.parse(JSON.stringify(workoutSession))} />
  );
}
