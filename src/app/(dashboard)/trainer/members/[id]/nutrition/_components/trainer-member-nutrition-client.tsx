'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SectionHeader } from '@/components/shared/section-header';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface DayTypeTarget {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SerializedRecentLog {
  date: string;
  dayTypeName: string;
  dayCompleted: boolean;
  actualKcal: number;
  actualProtein: number;
  actualCarbs: number;
  actualFat: number;
}

interface TemplateOption {
  _id: string;
  name: string;
}

interface Props {
  memberId: string;
  templates: TemplateOption[];
  recentLogs: SerializedRecentLog[];
  dayTypeTargets: Record<string, DayTypeTarget>;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;

function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function computeDayMacros(dayType: IDayType) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const meal of dayType.meals) {
    for (const item of meal.items) {
      kcal += item.kcal;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
    }
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function TrainerMemberNutritionClient({ memberId, templates, recentLogs, dayTypeTargets }: Props) {
  const [active, setActive] = useState<IMemberNutritionPlan | null>(null);
  const [history, setHistory] = useState<IMemberNutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [logVisible, setLogVisible] = useState(10);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch(`/api/members/${memberId}/nutrition`).then((r) => r.json()),
      fetch(`/api/members/${memberId}/nutrition/history`).then((r) => r.json()),
    ]).then(([a, h]: [IMemberNutritionPlan | null, IMemberNutritionPlan[]]) => {
      if (cancelled) return;
      setActive(a);
      setHistory(h);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [memberId, scheduleRefresh]);

  const weeklyPattern = active?.schedule.weeklyPattern ?? [];
  const calendarOverrides = active?.schedule.calendarOverrides ?? [];

  return (
    <div className="space-y-8 py-6">

      {/* ── Current Plan ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
          {!loading && active && (
            <AssignDialog
              templates={templates}
              memberId={memberId}
              onAssigned={(next) => { setActive(next); setHistory((h) => [next, ...h]); }}
              triggerLabel="Change Plan"
            />
          )}
        </div>

        {loading ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-muted/60 mb-2" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/40" />
          </div>
        ) : active ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-4">
            {/* Plan name + meta */}
            <div>
              <p className="text-[17px] font-bold text-foreground leading-tight">{active.name}</p>
              <p className="mt-1 text-[12px] text-foreground/45">
                {active.dayTypes.length} day {active.dayTypes.length === 1 ? 'type' : 'types'}
                <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
                Assigned {formatDate(active.assignedAt)}
              </p>
            </div>

            {/* Day type macro cards */}
            {active.dayTypes.length > 0 && (
              <div className={`grid gap-3 ${active.dayTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {active.dayTypes.map((dt) => {
                  const m = computeDayMacros(dt);
                  return (
                    <div key={dt.name} className="rounded-lg bg-muted/40 border border-foreground/8 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-foreground">{dt.name}</span>
                        <span className="text-[11px] text-foreground/40">
                          {dt.meals.length} {dt.meals.length === 1 ? 'meal' : 'meals'}
                        </span>
                      </div>
                      <div className="text-[22px] font-bold text-foreground leading-none mb-2">
                        {m.kcal.toLocaleString()}
                        <span className="text-[12px] font-medium text-foreground/45 ml-1">kcal</span>
                      </div>
                      <div className="flex gap-3 text-[12px]">
                        <span>
                          <span className="font-semibold text-emerald-400">{m.protein}g</span>
                          <span className="text-foreground/40 ml-1">protein</span>
                        </span>
                        <span>
                          <span className="font-semibold text-amber-400">{m.carbs}g</span>
                          <span className="text-foreground/40 ml-1">carbs</span>
                        </span>
                        <span>
                          <span className="font-semibold text-rose-400">{m.fat}g</span>
                          <span className="text-foreground/40 ml-1">fat</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex items-center justify-between">
            <p className="text-sm text-foreground/45">No nutrition plan assigned</p>
            <AssignDialog
              templates={templates}
              memberId={memberId}
              onAssigned={(next) => { setActive(next); setHistory((h) => [next, ...h]); }}
              triggerLabel="Assign Plan"
            />
          </div>
        )}
      </section>

      {/* ── Weekly Schedule ──────────────────────────────────────── */}
      {active && (
        <section className="px-4 sm:px-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Weekly Schedule</h2>
            <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <SheetTrigger className="flex items-center gap-1.5 text-[12px] text-foreground/45 hover:text-foreground/70 transition-colors bg-transparent border-none cursor-pointer">
                <Settings2 className="size-3.5" />
                Edit Schedule
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Edit Schedule</SheetTitle>
                  <p className="text-[12px] text-foreground/45 mt-1">
                    Changes to the weekly pattern take effect immediately. Date overrides can only be added from tomorrow onwards — today&apos;s schedule is locked.
                  </p>
                </SheetHeader>
                <ScheduleEditor
                  memberId={memberId}
                  dayTypeNames={active.dayTypes.map((d) => d.name)}
                  initialSchedule={active.schedule}
                  onSave={() => { setScheduleOpen(false); setScheduleRefresh((n) => n + 1); }}
                />
              </SheetContent>
            </Sheet>
          </div>

          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
            {weeklyPattern.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {[0,1,2,3,4,5,6].map((d) => {
                  const entry = weeklyPattern.find((w) => w.dayOfWeek === d);
                  return (
                    <div key={d} className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/35">
                        {DAY_LABELS[d]}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium text-center ${
                        entry
                          ? 'bg-primary/12 text-primary-light border border-primary/20'
                          : 'bg-muted/50 text-foreground/25 border border-foreground/8'
                      }`}>
                        {entry ? entry.dayTypeName : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-foreground/40">No weekly pattern set</p>
            )}

            {calendarOverrides.length > 0 && (
              <div className="pt-2 border-t border-foreground/8">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/35 mb-2">
                  Date Overrides
                </p>
                <div className="space-y-1">
                  {calendarOverrides.map((o) => (
                    <div key={o.date} className="flex items-center gap-2 text-[12px]">
                      <span className="text-foreground/50 font-medium">{o.date}</span>
                      <span className="text-foreground/25">→</span>
                      <span className="text-foreground/70">{o.dayTypeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weeklyPattern.length === 0 && calendarOverrides.length === 0 && (
              <p className="text-[13px] text-foreground/40">
                No schedule configured.{' '}
                <button
                  type="button"
                  className="text-primary/70 hover:text-primary underline underline-offset-2"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-schedule-trigger]')?.click()}
                >
                  Set one up
                </button>
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Adherence Log ────────────────────────────────────────── */}
      {recentLogs.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title={`Adherence Log (last 30 days)`} />
          <ul className="mt-3 space-y-1.5">
            {recentLogs.slice(0, logVisible).map((log) => {
              const target = dayTypeTargets[log.dayTypeName];
              const d = new Date(log.date + 'T00:00:00');
              const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <li key={log.date} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
                      <span className="text-[11px] text-foreground/40 bg-muted rounded-full px-2 py-0.5">
                        {log.dayTypeName}
                      </span>
                    </div>
                    {log.dayCompleted && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span>
                      <span className="font-semibold text-foreground">{log.actualKcal.toLocaleString()}</span>
                      <span className="text-foreground/40 ml-0.5">kcal</span>
                      {target && (
                        <span className="text-foreground/30 ml-1">/ {target.kcal.toLocaleString()}</span>
                      )}
                    </span>
                    <span>
                      <span className="font-semibold text-emerald-400">{log.actualProtein}g</span>
                      <span className="text-foreground/40 ml-0.5">prot</span>
                      {target && (
                        <span className="text-foreground/30 ml-1">/ {target.protein}g</span>
                      )}
                    </span>
                    <span>
                      <span className="font-semibold text-amber-400">{log.actualCarbs}g</span>
                      <span className="text-foreground/40 ml-0.5">carbs</span>
                      {target && (
                        <span className="text-foreground/30 ml-1">/ {target.carbs}g</span>
                      )}
                    </span>
                    <span>
                      <span className="font-semibold text-rose-400">{log.actualFat}g</span>
                      <span className="text-foreground/40 ml-0.5">fat</span>
                      {target && (
                        <span className="text-foreground/30 ml-1">/ {target.fat}g</span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {recentLogs.length > logVisible && (
            <button
              type="button"
              onClick={() => setLogVisible((c) => c + 10)}
              className="mt-3 w-full rounded-xl border border-foreground/10 py-2.5 text-sm text-foreground/50 hover:text-foreground/75 hover:border-foreground/20 transition-colors"
            >
              Show {Math.min(10, recentLogs.length - logVisible)} more
            </button>
          )}
        </section>
      )}

      {/* ── History ──────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="History" />
          <ul className="mt-3 space-y-1.5">
            {history.map((p) => (
              <li
                key={String(p._id)}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center"
              >
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                {p.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                    Active
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3 text-[12px] text-foreground/50">
                  <span>{formatDate(p.assignedAt)}</span>
                  <span className="text-foreground/25" aria-hidden="true">·</span>
                  <span>{p.dayTypes.length} day {p.dayTypes.length === 1 ? 'type' : 'types'}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AssignDialog({
  templates,
  memberId,
  onAssigned,
  triggerLabel,
}: {
  templates: TemplateOption[];
  memberId: string;
  onAssigned: (plan: IMemberNutritionPlan) => void;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function handleAssign() {
    if (!pickedTemplate) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/members/${memberId}/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: pickedTemplate }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to assign');
        return;
      }
      const next = (await res.json()) as IMemberNutritionPlan;
      onAssigned(next);
      toast.success('Plan assigned');
      setPickedTemplate('');
      setOpen(false);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-xs font-medium">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Assign Nutrition Plan</DialogTitle>
        <p className="text-xs text-foreground/65 -mt-1">
          Replaces the current active plan. History is kept.
        </p>
        <div className="space-y-3 mt-2">
          <select
            value={pickedTemplate}
            onChange={(e) => setPickedTemplate(e.target.value)}
            aria-label="Select nutrition template"
            className="w-full rounded-md bg-muted border border-border/60 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="" disabled>Select a nutrition template</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={handleAssign}
              disabled={!pickedTemplate || assigning}
              className="text-xs font-semibold"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
