'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface MemberNutritionPlan {
  _id: string;
  name: string;
  assignedByName: string;
  dayTypes: Array<{
    name: string;
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }>;
}

interface Props {
  plan: MemberNutritionPlan | null;
  todayDayTypeName: string | null;
  basePath?: '/member/nutrition';
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MemberNutritionPlanPathCard({ plan, todayDayTypeName, basePath = '/member/nutrition' }: Props) {
  const { push } = useRouter();

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

  const todayDayType = todayDayTypeName
    ? plan.dayTypes.find((dt) => dt.name === todayDayTypeName) ?? null
    : null;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        My Plan
      </span>
      <div className="mb-3">
        <div className="text-sm font-semibold">{plan.name}</div>
        <div className="text-[10px] text-foreground/65 mt-0.5">
          Assigned by {plan.assignedByName} · {plan.dayTypes.length} day type{plan.dayTypes.length === 1 ? '' : 's'}
        </div>
      </div>

      {todayDayType ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg ring-1 ring-foreground/10 px-3 py-2.5 bg-foreground/[0.02]">
            <div className="text-[12px] font-semibold text-foreground">{todayDayType.name}</div>
            <div className="text-[10px] text-foreground/65 mt-0.5">
              {todayDayType.targetKcal} kcal · P {todayDayType.targetProtein}g · C {todayDayType.targetCarbs}g · F {todayDayType.targetFat}g
            </div>
          </div>
          <Button
            type="button"
            onClick={() => push(`${basePath}/day?date=${todayISO()}&mode=plan`)}
            className="w-full"
          >
            Log Today
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-foreground/65 mb-1">No plan for today. Pick a day:</p>
          {plan.dayTypes.map((dt) => (
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
                  push(
                    `${basePath}/day?date=${todayISO()}&mode=plan&dayTypeName=${encodeURIComponent(dt.name)}`,
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
