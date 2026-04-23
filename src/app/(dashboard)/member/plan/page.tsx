import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { PlanOverview } from './_components/plan-overview';

export default async function MemberPlanPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoMemberPlanRepository();
  const plan = await repo.findActive(session.user.id);

  return <PlanOverview plan={JSON.parse(JSON.stringify(plan))} />;
}
