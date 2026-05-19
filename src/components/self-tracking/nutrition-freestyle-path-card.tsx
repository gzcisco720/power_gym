'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MacroPill } from '@/components/nutrition/macro-pill';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

interface LastFreestyle {
  dateLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface TodayLog {
  kcal: number;
  dayCompleted: boolean;
}

type Props =
  | { state: 'empty'; basePath: BasePath; todayLog?: TodayLog | null; planDoneToday?: boolean }
  | { state: 'light'; lastFreestyle: LastFreestyle; basePath: BasePath; todayLog?: TodayLog | null; planDoneToday?: boolean }
  | { state: 'full'; lastFreestyle: LastFreestyle; daysThisWeek: number; basePath: BasePath; todayLog?: TodayLog | null; planDoneToday?: boolean };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function freestyleDayPath(basePath: BasePath): string {
  if (basePath === '/member/nutrition') {
    return `/member/nutrition/day?date=${todayISO()}&mode=free`;
  }
  // noNav=1 tells the day page to suppress date navigation (today-only)
  return `${basePath}/day?date=${todayISO()}&noNav=1`;
}

export function NutritionFreestylePathCard(props: Props) {
  const router = useRouter();

  const todayLog = props.todayLog;
  const isMember = props.basePath === '/member/nutrition';
  const planDoneToday = isMember && !!props.planDoneToday;

  const todayCTA =
    todayLog != null ? (
      <div className="mt-auto flex flex-col gap-2">
        <div className="text-[11px] text-foreground/65">
          Today · {todayLog.kcal.toLocaleString()} kcal
          {todayLog.dayCompleted && ' · completed'}
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(freestyleDayPath(props.basePath))}
        >
          {todayLog.dayCompleted ? "View Today's Log" : "Continue Today's Log"}
        </Button>
      </div>
    ) : null;

  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          Freestyle
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">🥦</span>
          <p className="text-sm text-foreground/65">No freestyle logs yet.</p>
          <p className="text-xs text-foreground/65">Log any day without a template.</p>
        </div>
        {todayCTA ?? (
          planDoneToday ? (
            <div className="mt-auto flex flex-col gap-2">
              <div className="text-[11px] text-foreground/65">Plan completed for today.</div>
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push(`/member/nutrition/day?date=${todayISO()}&mode=plan`)}
              >
                View Today&apos;s Log
              </Button>
            </div>
          ) : (
            <Button variant="outline" type="button" onClick={() => router.push(freestyleDayPath(props.basePath))}>
              Log Today
            </Button>
          )
        )}
      </div>
    );
  }

  const { lastFreestyle } = props;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        Freestyle
      </span>
      <div className="rounded-lg ring-1 ring-foreground/10 p-3 mb-3 bg-foreground/[0.02]">
        <div className="text-[10px] text-foreground/65 uppercase tracking-[0.08em] mb-1">
          {lastFreestyle.dateLabel}
        </div>
        <div className="text-lg font-bold">
          {lastFreestyle.kcal.toLocaleString()} kcal
        </div>
        <div className="flex gap-1.5 mt-1.5">
          <MacroPill value={lastFreestyle.protein} label="g protein" tone="emerald" />
          <MacroPill value={lastFreestyle.carbs} label="g carbs" tone="amber" />
          <MacroPill value={lastFreestyle.fat} label="g fat" tone="pink" />
        </div>
      </div>
      {props.state === 'full' && (
        <p className="text-[11px] text-foreground/65 mb-3">
          {props.daysThisWeek}× this week
        </p>
      )}
      {todayCTA ?? (
        planDoneToday ? (
          <div className="mt-auto flex flex-col gap-2">
            <div className="text-[11px] text-foreground/65">Plan completed for today.</div>
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(`/member/nutrition/day?date=${todayISO()}&mode=plan`)}
            >
              View Today&apos;s Log
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            type="button"
            className="mt-auto"
            onClick={() => router.push(freestyleDayPath(props.basePath))}
          >
            Log Today (Freestyle)
          </Button>
        )
      )}
    </div>
  );
}
