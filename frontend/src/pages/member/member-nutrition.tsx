import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionActivityStrip } from '@/components/self-tracking/nutrition-activity-strip';
import { NutritionFreestylePathCard } from '@/components/self-tracking/nutrition-freestyle-path-card';
import { PathCardsGrid, PathCardItem } from '@/components/self-tracking/path-cards-grid';
import { MiniNutritionCalendar } from '@/components/self-tracking/mini-nutrition-calendar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useMemberNutritionStore } from '@/stores/memberNutritionStore';
import { request } from '@/api/client';
import type { ActiveNutritionPlan, NutritionSchedule } from '@/api/member-hub';
import type { SelfNutritionLog } from '@/api/self-nutrition';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveDayType(
  schedule: NutritionSchedule,
  dateISO: string,
  startDateISO: string,
): string | null {
  const override = schedule.calendarOverrides.find((o) => o.date === dateISO);
  if (override) return override.dayTypeName;
  if (schedule.weeklyPattern.length === 0) return null;
  const targetDate = new Date(`${dateISO}T00:00:00Z`);
  const startDate = new Date(`${startDateISO}T00:00:00Z`);
  const daysSinceStart = Math.floor((targetDate.getTime() - startDate.getTime()) / 86400000);
  if (daysSinceStart < 0) return null;
  if (!schedule.iterate && daysSinceStart >= 7) return null;
  const dayOfWeek = targetDate.getUTCDay();
  const entry = schedule.weeklyPattern.find((w) => w.dayOfWeek === dayOfWeek);
  return entry?.dayTypeName ?? null;
}

interface DayTypeTarget {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

function computeDayTypeTargets(plan: ActiveNutritionPlan): DayTypeTarget[] {
  return plan.dayTypes.map((dt) => {
    let kcal = 0, protein = 0, carbs = 0, fat = 0;
    for (const meal of dt.meals as { items: { kcal: number; protein: number; carbs: number; fat: number }[] }[]) {
      for (const item of meal.items) {
        kcal += item.kcal;
        protein += item.protein;
        carbs += item.carbs;
        fat += item.fat;
      }
    }
    return {
      name: dt.name,
      targetKcal: Math.round(kcal),
      targetProtein: Math.round(protein),
      targetCarbs: Math.round(carbs),
      targetFat: Math.round(fat),
    };
  });
}

function detectLandingState(completedCount: number, hasUsedTemplate: boolean): 'full' | 'light' | 'empty' {
  if (completedCount >= 5 || (completedCount >= 2 && hasUsedTemplate)) return 'full';
  if (completedCount >= 1) return 'light';
  return 'empty';
}

function avgKcalFromLogs(logs: SelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.kcal, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

function avgProteinFromLogs(logs: SelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.protein, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

// ─── Member Nutrition Plan Path Card ─────────────────────────────────────────

function MemberNutritionPlanPathCard({
  plan,
  todayDayTypeName,
  dayTypeTargets,
  basePath,
}: {
  plan: ActiveNutritionPlan | null;
  todayDayTypeName: string | null;
  dayTypeTargets: DayTypeTarget[];
  basePath: string;
}) {
  const navigate = useNavigate();
  const today = todayISO();

  if (!plan) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          My Plan
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-35">📋</span>
          <p className="text-sm text-foreground/65">No nutrition plan assigned yet.</p>
          <p className="text-xs text-foreground/65">Ask your trainer to assign a plan.</p>
        </div>
      </div>
    );
  }

  const todayTarget = todayDayTypeName
    ? dayTypeTargets.find((dt) => dt.name === todayDayTypeName) ?? null
    : null;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        My Plan
      </span>
      <div className="mb-3">
        <div className="text-sm font-semibold">{plan.name}</div>
        <div className="text-[10px] text-foreground/65 mt-0.5">
          {plan.dayTypes.length} day type{plan.dayTypes.length === 1 ? '' : 's'}
        </div>
      </div>

      {todayTarget ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg ring-1 ring-foreground/10 px-3 py-2.5 bg-foreground/[0.02]">
            <div className="text-[12px] font-semibold text-foreground">{todayTarget.name}</div>
            <div className="text-[10px] text-foreground/65 mt-0.5">
              {todayTarget.targetKcal} kcal · P {todayTarget.targetProtein}g · C {todayTarget.targetCarbs}g · F {todayTarget.targetFat}g
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigate(`${basePath}?date=${today}`)}
            className="w-full"
          >
            Log Today
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-foreground/65 mb-1">Pick a day type to log:</p>
          {dayTypeTargets.map((dt) => (
            <div
              key={dt.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium">{dt.name}</div>
                <div className="text-[10px] text-foreground/65">
                  {dt.targetKcal} kcal · P {dt.targetProtein}g · C {dt.targetCarbs}g · F {dt.targetFat}g
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() =>
                  navigate(
                    `${basePath}?date=${today}&dayTypeName=${encodeURIComponent(dt.name)}`,
                  )
                }
                className="h-6 px-2 text-[11px] shrink-0 text-primary-light hover:bg-primary/10"
              >
                Log
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MemberNutritionPage() {
  const user = useAuthStore((s) => s.user);
  const { activePlan, fetchActivePlan } = useMemberNutritionStore();
  const [monthLogs, setMonthLogs] = useState<SelfNutritionLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<SelfNutritionLog[]>([]);
  const [todayFreestyleLog, setTodayFreestyleLog] = useState<{ kcal: number; dayCompleted: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const today = todayISO();

      const [monthData, recentData, todayData] = await Promise.all([
        request<SelfNutritionLog[]>(`/api/me/nutrition-logs?year=${year}&month=${month}`).catch(() => [] as SelfNutritionLog[]),
        request<SelfNutritionLog[]>(`/api/me/nutrition-logs?year=${year}&month=${month}`).catch(() => [] as SelfNutritionLog[]),
        request<SelfNutritionLog | null>(`/api/me/nutrition-logs/${today}`).catch(() => null),
      ]);

      await fetchActivePlan(user.id);
      setMonthLogs(monthData);
      setRecentLogs(recentData.slice(0, 14));
      if (todayData) {
        const kcal = Math.round(
          todayData.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
        );
        setTodayFreestyleLog({ kcal, dayCompleted: todayData.dayCompleted });
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchActivePlan]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const now = new Date();
  const today = todayISO();

  const completedCount = recentLogs.filter((l) => l.dayCompleted).length;
  const hasUsedTemplate = recentLogs.some((l) => l.sourceTemplateId !== null);
  const state = detectLandingState(completedCount, hasUsedTemplate);

  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14Days.push(recentLogs.some((l) => l.date === iso));
  }

  const avgKcal = avgKcalFromLogs(monthLogs);
  const avgProtein = avgProteinFromLogs(monthLogs);
  const daysThisMonth = new Set(monthLogs.map((l) => l.date)).size;

  const headerSubtitle =
    state === 'full'
      ? `${daysThisMonth} days in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedCount} days logged`
        : 'Track your daily nutrition here.';

  const todayDayTypeName: string | null = activePlan
    ? resolveDayType(
        activePlan.schedule,
        today,
        activePlan.assignedAt.slice(0, 10),
      )
    : null;

  const dayTypeTargets: DayTypeTarget[] = activePlan ? computeDayTypeTargets(activePlan) : [];

  const lastFreestyleLog = recentLogs.find((l) => l.sourceTemplateId === null && l.dayCompleted) ?? null;

  function countDaysThisWeek(): number {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    const weekAgoISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return recentLogs.filter((l) => l.date >= weekAgoISO).length;
  }

  const lastFreestyle = lastFreestyleLog
    ? (() => {
        const kcal = Math.round(
          lastFreestyleLog.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
        );
        const protein = Math.round(
          lastFreestyleLog.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.protein, 0), 0),
        );
        const carbs = Math.round(
          lastFreestyleLog.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.carbs, 0), 0),
        );
        const fat = Math.round(
          lastFreestyleLog.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.fat, 0), 0),
        );
        const d = new Date(lastFreestyleLog.date + 'T00:00:00');
        const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        return { dateLabel, kcal, protein, carbs, fat };
      })()
    : undefined;

  if (loading) {
    return (
      <div>
        <PageHeader title="My Nutrition" subtitle="Loading..." />
        <div className="px-4 sm:px-8 py-6 space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Nutrition" subtitle={headerSubtitle} />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <NutritionActivityStrip
            state="full"
            last14Days={last14Days}
            daysThisMonth={daysThisMonth}
            avgKcal={avgKcal}
            avgProteinG={avgProtein}
          />
        )}
        {state === 'light' && (
          <NutritionActivityStrip state="light" last14Days={last14Days} daysLogged={completedCount} />
        )}
        {state === 'empty' && <NutritionActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <MemberNutritionPlanPathCard
              plan={activePlan}
              todayDayTypeName={todayDayTypeName}
              dayTypeTargets={dayTypeTargets}
              basePath="/member/nutrition/day"
            />
          </PathCardItem>
          <PathCardItem>
            {!lastFreestyleLog && (
              <NutritionFreestylePathCard
                state="empty"
                basePath="/member/nutrition"
                todayLog={todayFreestyleLog}
              />
            )}
            {lastFreestyleLog && state === 'full' && lastFreestyle && (
              <NutritionFreestylePathCard
                state="full"
                lastFreestyle={lastFreestyle}
                daysThisWeek={countDaysThisWeek()}
                basePath="/member/nutrition"
                todayLog={todayFreestyleLog}
              />
            )}
            {lastFreestyleLog && state !== 'full' && lastFreestyle && (
              <NutritionFreestylePathCard
                state="light"
                lastFreestyle={lastFreestyle}
                basePath="/member/nutrition"
                todayLog={todayFreestyleLog}
              />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniNutritionCalendar basePath="/member/nutrition" />
      </div>
    </div>
  );
}
