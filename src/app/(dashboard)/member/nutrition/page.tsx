import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { NutritionPlanViewer } from './_components/nutrition-plan-viewer';

export default async function MemberNutritionPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  return <NutritionPlanViewer plan={JSON.parse(JSON.stringify(plan))} />;
}
