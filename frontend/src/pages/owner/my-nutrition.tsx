import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionActivityStrip } from '@/components/self-tracking/nutrition-activity-strip';
import { NutritionTemplatePathCard, type NutritionTemplate } from '@/components/self-tracking/nutrition-template-path-card';
import { NutritionFreestylePathCard } from '@/components/self-tracking/nutrition-freestyle-path-card';
import { PathCardsGrid, PathCardItem } from '@/components/self-tracking/path-cards-grid';
import { MiniNutritionCalendar } from '@/components/self-tracking/mini-nutrition-calendar';
import { request } from '@/api/client';
import type { SelfNutritionLog } from '@/api/self-nutrition';

type BasePath = '/owner/my-nutrition';

interface NutritionTemplateRaw {
  _id: string;
  name: string;
  dayTypes: Array<{
    name: string;
    meals: Array<{ items: Array<{ kcal: number; protein: number; carbs: number; fat: number }> }>;
  }>;
}

interface LandingData {
  monthLogs: SelfNutritionLog[];
  recent: SelfNutritionLog[];
  templates: NutritionTemplate[];
  todayFreestyleLog: { kcal: number; dayCompleted: boolean } | null;
}

function detectLandingState(completedCount: number, hasUsedTemplate: boolean): 'full' | 'light' | 'empty' {
  if (completedCount >= 5 || (completedCount >= 2 && hasUsedTemplate)) return 'full';
  if (completedCount >= 1) return 'light';
  return 'empty';
}

function avgKcal(logs: SelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.kcal, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

function avgProtein(logs: SelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce(
    (s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.protein, 0), 0),
    0,
  );
  return Math.round(total / logs.length);
}

function countDaysThisWeek(logs: SelfNutritionLog[]): number {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 7);
  const weekAgoISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return logs.filter((l) => l.date >= weekAgoISO).length;
}

function toCardTemplate(raw: NutritionTemplateRaw): NutritionTemplate {
  return {
    _id: raw._id,
    name: raw.name,
    dayTypes: raw.dayTypes.map((dt) => {
      const items = dt.meals.flatMap((m) => m.items);
      return {
        name: dt.name,
        targetKcal: Math.round(items.reduce((s, i) => s + i.kcal, 0)),
        targetProtein: Math.round(items.reduce((s, i) => s + i.protein, 0)),
        targetCarbs: Math.round(items.reduce((s, i) => s + i.carbs, 0)),
        targetFat: Math.round(items.reduce((s, i) => s + i.fat, 0)),
      };
    }),
  };
}

export function OwnerMyNutritionPage() {
  const basePath: BasePath = '/owner/my-nutrition';
  const [data, setData] = useState<LandingData | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayISO = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    Promise.all([
      request<SelfNutritionLog[]>(`/api/me/nutrition-logs?year=${year}&month=${month}`).catch(() => []),
      request<NutritionTemplateRaw[]>('/api/nutrition-templates').catch(() => []),
      request<SelfNutritionLog | null>(`/api/me/nutrition-logs/${todayISO}`).catch(() => null),
    ]).then(([monthLogs, rawTemplates, todayLog]) => {
      const recent = [...monthLogs].slice(0, 14);
      const templates = rawTemplates.map(toCardTemplate);
      const todayFreestyleLog = todayLog
        ? {
            kcal: Math.round(
              todayLog.meals.reduce(
                (s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0),
                0,
              ),
            ),
            dayCompleted: todayLog.dayCompleted,
          }
        : null;
      setData({ monthLogs, recent, templates, todayFreestyleLog });
    }).catch(() => { /* silent */ });
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="My Nutrition" />
        <div className="p-6 text-foreground/65 text-sm">Loading…</div>
      </div>
    );
  }

  const { monthLogs, recent, templates, todayFreestyleLog } = data;
  const now = new Date();

  const completedCount = recent.filter((l) => l.dayCompleted).length;
  const hasUsedTemplate = recent.some((l) => l.sourceTemplateId !== null);
  const state = detectLandingState(completedCount, hasUsedTemplate);

  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14Days.push(recent.some((l) => l.date === iso));
  }

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} days in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedCount} days logged`
        : "Track your own nutrition here — kept separate from your members'.";

  const lastFreestyleLog = recent.find((l) => l.sourceTemplateId === null && l.dayCompleted);

  function toLastFreestyle(log: SelfNutritionLog) {
    const kcal = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0));
    const protein = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.protein, 0), 0));
    const carbs = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.carbs, 0), 0));
    const fat = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.fat, 0), 0));
    const d = new Date(`${log.date}T00:00:00`);
    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { dateLabel, kcal, protein, carbs, fat };
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Nutrition" subtitle={headerSubtitle} />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <NutritionActivityStrip
            state="full"
            last14Days={last14Days}
            daysThisMonth={monthLogs.length}
            avgKcal={avgKcal(monthLogs)}
            avgProteinG={avgProtein(monthLogs)}
          />
        )}
        {state === 'light' && (
          <NutritionActivityStrip state="light" last14Days={last14Days} daysLogged={completedCount} />
        )}
        {state === 'empty' && <NutritionActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <NutritionTemplatePathCard templates={templates} basePath={basePath} />
          </PathCardItem>
          <PathCardItem>
            {!lastFreestyleLog ? (
              <NutritionFreestylePathCard
                state="empty"
                basePath={basePath}
                todayLog={todayFreestyleLog}
              />
            ) : state === 'full' ? (
              <NutritionFreestylePathCard
                state="full"
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                daysThisWeek={countDaysThisWeek(recent)}
                basePath={basePath}
                todayLog={todayFreestyleLog}
              />
            ) : (
              <NutritionFreestylePathCard
                state="light"
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                basePath={basePath}
                todayLog={todayFreestyleLog}
              />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniNutritionCalendar basePath={basePath} />
      </div>
    </div>
  );
}
