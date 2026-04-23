import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { TrainerMemberPlanClient } from './_components/trainer-member-plan-client';

export default async function TrainerMemberPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [templates, activePlan, sessions, pbs] = await Promise.all([
    new MongoPlanTemplateRepository().findByCreator(session.user.id),
    new MongoMemberPlanRepository().findActive(memberId),
    new MongoWorkoutSessionRepository().findByMember(memberId),
    new MongoPersonalBestRepository().findByMember(memberId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学员训练管理</h1>
      <TrainerMemberPlanClient
        memberId={memberId}
        templates={JSON.parse(JSON.stringify(templates))}
        activePlan={JSON.parse(JSON.stringify(activePlan))}
        sessions={JSON.parse(JSON.stringify(sessions))}
        pbs={JSON.parse(JSON.stringify(pbs))}
      />
    </div>
  );
}
