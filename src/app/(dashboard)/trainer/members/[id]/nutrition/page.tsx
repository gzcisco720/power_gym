import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { TrainerMemberNutritionClient } from './_components/trainer-member-nutrition-client';

export default async function TrainerMemberNutritionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [templates, activePlan] = await Promise.all([
    new MongoNutritionTemplateRepository().findByCreator(session.user.id),
    new MongoMemberNutritionPlanRepository().findActive(memberId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学员营养管理</h1>
      <TrainerMemberNutritionClient
        memberId={memberId}
        templates={JSON.parse(JSON.stringify(templates))}
        activePlan={JSON.parse(JSON.stringify(activePlan))}
      />
    </div>
  );
}
