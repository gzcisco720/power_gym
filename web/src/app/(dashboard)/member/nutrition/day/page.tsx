import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionDayClient } from './_components/member-nutrition-day-client';
import type { PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';
import { computeDayTypeTargets } from '@/lib/nutrition/compute-day-type-targets';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string; mode?: string; dayTypeName?: string }>;
}

export default async function MemberNutritionDayPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');

  const { date: rawDate, mode: rawMode, dayTypeName } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;
  const mode = rawMode === 'free' ? 'free' : 'plan';

  await connectDB();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(session.user.id);

  const planDayTypes: PlanDayType[] = plan
    ? plan.dayTypes.map((dt) => ({ name: dt.name, ...computeDayTypeTargets(dt) }))
    : [];

  return (
    <MemberNutritionDayClient
      memberId={session.user.id}
      initialDate={date}
      mode={mode}
      forceDayType={dayTypeName}
      planDayTypes={planDayTypes}
    />
  );
}
