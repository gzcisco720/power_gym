import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { summarizeSession, type RawSessionInput } from '@/lib/training/session-summary';
import { TrainerMemberPlanClient } from './_components/trainer-member-plan-client';

export default async function TrainerMemberPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activeSession?: string; activeDayName?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;
  const sp = await searchParams;

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const [templates, activePlan, sessions, pbs, activeSession] = await Promise.all([
    new MongoPlanTemplateRepository().findByCreator(session.user.id),
    new MongoMemberPlanRepository().findActive(memberId),
    sessionRepo.findByMember(memberId, 50),
    new MongoPersonalBestRepository().findByMember(memberId),
    sessionRepo.findActive(memberId),
  ]);

  const rawSessions = JSON.parse(JSON.stringify(sessions)) as RawSessionInput[];
  const sessionSummaries = rawSessions.map(summarizeSession);

  const conflict = sp.activeSession
    ? { sessionId: sp.activeSession, dayName: sp.activeDayName ?? '' }
    : null;

  const activePrompt = activeSession
    ? {
        sessionId: activeSession._id.toString(),
        dayName: activeSession.dayName,
        startedAtIso: activeSession.startedAt.toISOString(),
        lastActivityAtIso: activeSession.lastActivityAt.toISOString(),
      }
    : null;

  return (
    <div>
      <TrainerMemberPlanClient
        memberId={memberId}
        templates={JSON.parse(JSON.stringify(templates))}
        activePlan={JSON.parse(JSON.stringify(activePlan))}
        sessions={sessionSummaries}
        pbs={JSON.parse(JSON.stringify(pbs))}
        conflict={conflict}
        activePrompt={activePrompt}
      />
    </div>
  );
}
