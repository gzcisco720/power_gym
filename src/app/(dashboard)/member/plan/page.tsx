import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { PlanOverview } from './_components/plan-overview';

export default async function MemberPlanPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const [plan, activeSession] = await Promise.all([
    new MongoMemberPlanRepository().findActive(session.user.id),
    new MongoWorkoutSessionRepository().findActive(session.user.id),
  ]);

  const activePrompt = activeSession
    ? {
        sessionId: activeSession._id.toString(),
        dayName: activeSession.dayName,
        startedAtIso: activeSession.startedAt.toISOString(),
        lastActivityAtIso: activeSession.lastActivityAt.toISOString(),
      }
    : null;

  return (
    <PlanOverview
      plan={JSON.parse(JSON.stringify(plan))}
      activePrompt={activePrompt}
    />
  );
}
