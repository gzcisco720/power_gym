import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { NutritionActivityStrip } from './nutrition-activity-strip';
import { MemberNutritionPlanPathCard, type MemberNutritionPlan } from './member-nutrition-plan-path-card';
import { NutritionFreestylePathCard } from './nutrition-freestyle-path-card';
import { MiniNutritionCalendar } from './mini-nutrition-calendar';
import { NutritionCalendarHeaderTrigger } from './nutrition-calendar-header-trigger';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import { PageHeader } from '@/components/shared/page-header';
import { computeDayTypeTargets } from '@/lib/nutrition/compute-day-type-targets';
import { resolveDayType } from '@/lib/nutrition/schedule';
import type { ISelfNutritionLog } from '@/lib/db/models/self-nutrition-log.model';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';

export async function MemberNutritionLanding() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfNutritionLogRepository();
  const planLogRepo = new MongoNutritionDailyLogRepository();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const userRepo = new MongoUserRepository();

  const now = new Date();
  const [monthLogs, recent, planMonthLogs, activePlan] = await Promise.all([
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 14),
    planLogRepo.findByMemberMonth(userId, now.getFullYear(), now.getMonth() + 1),
    planRepo.findActive(userId),
  ]);

  let trainerName = 'your trainer';
  if (activePlan?.assignedById) {
    const trainer = await userRepo.findById(activePlan.assignedById.toString());
    if (trainer?.name) trainerName = trainer.name;
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayDayTypeName: string | null = activePlan
    ? resolveDayType(
        activePlan.schedule,
        todayISO,
        activePlan.assignedAt.toISOString().slice(0, 10),
      )
    : null;

  const todayFreestyleLog = await logRepo.findByDate(userId, todayISO);
  const todayFreestyleLogSummary =
    todayFreestyleLog != null
      ? {
          kcal: Math.round(
            todayFreestyleLog.meals.reduce(
              (s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0),
              0,
            ),
          ),
          dayCompleted: todayFreestyleLog.dayCompleted,
        }
      : null;

  // Merge freestyle + plan-based log dates for activity tracking
  const planLogDates = new Set(planMonthLogs.map((l) => l.date));
  const allMonthDates = new Set([...monthLogs.map((l) => l.date), ...planLogDates]);
  const totalDaysThisMonth = allMonthDates.size;

  const freestyleCompleted = recent.filter((l) => l.dayCompleted).length;
  // Count plan-based completed days in the last 14 days for state detection
  const planRecentDates = new Set(planMonthLogs.filter((l) => l.dayCompleted).map((l) => l.date));
  const totalCompletedCount = freestyleCompleted + planRecentDates.size;
  const hasUsedTemplate = recent.some((l) => l.sourceTemplateId !== null) || planMonthLogs.length > 0;
  const state = detectLandingState({ completedSessionCount: totalCompletedCount, hasUsedTemplate });

  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14Days.push(recent.some((l) => l.date === iso) || planLogDates.has(iso));
  }

  const avgKcal = avgKcalFromLogs(monthLogs);
  const avgProtein = avgProteinFromLogs(monthLogs);

  const headerSubtitle =
    state === 'full'
      ? `${totalDaysThisMonth} days in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${totalCompletedCount} days logged`
        : 'Track your daily nutrition here.';

  const plan = activePlan ? toPlanCard(activePlan, trainerName) : null;
  const lastFreestyleLog = recent.find((l) => l.sourceTemplateId === null && l.dayCompleted);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        subtitle={headerSubtitle}
        actions={<NutritionCalendarHeaderTrigger basePath="/member/nutrition" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <NutritionActivityStrip
            state="full"
            last14Days={last14Days}
            daysThisMonth={totalDaysThisMonth}
            avgKcal={avgKcal}
            avgProteinG={avgProtein}
          />
        )}
        {state === 'light' && (
          <NutritionActivityStrip state="light" last14Days={last14Days} daysLogged={totalCompletedCount} />
        )}
        {state === 'empty' && <NutritionActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <MemberNutritionPlanPathCard plan={plan} todayDayTypeName={todayDayTypeName} basePath="/member/nutrition" />
          </PathCardItem>
          <PathCardItem>
            {!lastFreestyleLog && (
              <NutritionFreestylePathCard
                state="empty"
                basePath="/member/nutrition"
                todayLog={todayFreestyleLogSummary}
              />
            )}
            {lastFreestyleLog && state === 'full' && (
              <NutritionFreestylePathCard
                state="full"
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                daysThisWeek={countDaysThisWeek(recent)}
                basePath="/member/nutrition"
                todayLog={todayFreestyleLogSummary}
              />
            )}
            {lastFreestyleLog && state !== 'full' && (
              <NutritionFreestylePathCard
                state="light"
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                basePath="/member/nutrition"
                todayLog={todayFreestyleLogSummary}
              />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniNutritionCalendar basePath="/member/nutrition" memberId={userId} />
      </div>
    </div>
  );
}

function toPlanCard(plan: IMemberNutritionPlan, trainerName: string): MemberNutritionPlan {
  return {
    _id: plan._id.toString(),
    name: plan.name,
    assignedByName: trainerName,
    dayTypes: plan.dayTypes.map((dt) => ({
      name: dt.name,
      ...computeDayTypeTargets(dt),
    })),
  };
}

function avgKcalFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.kcal, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

function avgProteinFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.protein, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

function countDaysThisWeek(logs: ISelfNutritionLog[]): number {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 7);
  const weekAgoISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return logs.filter((l) => l.date >= weekAgoISO).length;
}

function toLastFreestyle(log: ISelfNutritionLog) {
  const kcal = Math.round(
    log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
  );
  const protein = Math.round(
    log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.protein, 0), 0),
  );
  const carbs = Math.round(
    log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.carbs, 0), 0),
  );
  const fat = Math.round(
    log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.fat, 0), 0),
  );
  const d = new Date(log.date + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
  return { dateLabel, kcal, protein, carbs, fat };
}
