import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

export default async function OwnerMyPlanPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);

  return <PlanOverview plan={JSON.parse(JSON.stringify(plan))} sessionBasePath="/owner/my-plan" />;
}
