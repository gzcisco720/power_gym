import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { TrainerMemberNutritionClient, type SerializedRecentLog, type DayTypeTarget } from './_components/trainer-member-nutrition-client';

type RouteContext = { params: Promise<{ id: string }> };

export default async function Page({ params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role === 'member') redirect('/login');
  const { id } = await params;

  await connectDB();
  const [templates, activePlan, recentRaw] = await Promise.all([
    new MongoNutritionTemplateRepository().findByCreator(session.user.id),
    new MongoMemberNutritionPlanRepository().findActive(id),
    new MongoNutritionDailyLogRepository().findRecent(id, 30),
  ]);

  // Build day type targets from the active plan
  const dayTypeTargets: Record<string, DayTypeTarget> = {};
  if (activePlan) {
    for (const dt of activePlan.dayTypes) {
      let kcal = 0, protein = 0, carbs = 0, fat = 0;
      for (const meal of dt.meals) {
        for (const item of meal.items) {
          kcal += item.kcal;
          protein += item.protein;
          carbs += item.carbs;
          fat += item.fat;
        }
      }
      dayTypeTargets[dt.name] = {
        kcal: Math.round(kcal),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      };
    }
  }

  // Serialize recent logs with computed actual macros
  const recentLogs: SerializedRecentLog[] = recentRaw.map((log) => {
    let kcal = 0, protein = 0, carbs = 0, fat = 0;
    for (const meal of log.meals) {
      for (const item of meal.items) {
        kcal += item.kcal;
        protein += item.protein;
        carbs += item.carbs;
        fat += item.fat;
      }
    }
    return {
      date: log.date,
      dayTypeName: log.dayTypeName,
      dayCompleted: log.dayCompleted,
      actualKcal: Math.round(kcal),
      actualProtein: Math.round(protein),
      actualCarbs: Math.round(carbs),
      actualFat: Math.round(fat),
    };
  });

  return (
    <TrainerMemberNutritionClient
      memberId={id}
      templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
      recentLogs={recentLogs}
      dayTypeTargets={dayTypeTargets}
    />
  );
}
