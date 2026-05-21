import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';

export default async function TrainerLogSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId, sessionId } = await params;

  await connectDB();
  const [workoutSession, member] = await Promise.all([
    new MongoWorkoutSessionRepository().findById(sessionId),
    new MongoUserRepository().findById(memberId),
  ]);

  const memberBase = session.user.role === 'owner' ? `/owner/members/${memberId}` : `/trainer/members/${memberId}`;
  if (!workoutSession) redirect(`${memberBase}/plan`);

  return (
    <SessionLogger
      session={JSON.parse(JSON.stringify(workoutSession))}
      backPath={`${memberBase}/plan`}
      mode="trainer"
      loggedForMember={{ id: memberId, name: member?.name ?? 'Member' }}
    />
  );
}
