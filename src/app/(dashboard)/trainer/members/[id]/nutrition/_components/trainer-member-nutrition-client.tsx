'use client';

import { useEffect, useState, useReducer } from 'react';
import { useMemberHub } from '../../_components/member-hub-provider';
import { useRouter } from 'next/navigation';
import { Settings2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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

interface TrainerMemberNutritionClientState {
  active: IMemberNutritionPlan | null;
  history: IMemberNutritionPlan[];
  loading: boolean;
  logVisible: number;
  scheduleOpen: boolean;
  scheduleRefresh: number;
}

type TrainerMemberNutritionClientAction =
  | { type: 'SET_ACTIVE'; value: IMemberNutritionPlan | null }
  | { type: 'SET_HISTORY'; value: IMemberNutritionPlan[] }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_LOG_VISIBLE'; value: number }
  | { type: 'SET_SCHEDULE_OPEN'; value: boolean }
  | { type: 'SET_SCHEDULE_REFRESH'; value: number };

function trainerMemberNutritionClientReducer(state: TrainerMemberNutritionClientState, action: TrainerMemberNutritionClientAction): TrainerMemberNutritionClientState {
  switch (action.type) {
    case 'SET_ACTIVE': return { ...state, active: action.value };
    case 'SET_HISTORY': return { ...state, history: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_LOG_VISIBLE': return { ...state, logVisible: action.value };
    case 'SET_SCHEDULE_OPEN': return { ...state, scheduleOpen: action.value };
    case 'SET_SCHEDULE_REFRESH': return { ...state, scheduleRefresh: action.value };
    default: return state;
  }
}

export function TrainerMemberNutritionClient({ memberId, templates, recentLogs, dayTypeTargets }: Props) {
  const [state, dispatch] = useReducer(trainerMemberNutritionClientReducer, {
    active: null, history: [], loading: true, logVisible: 10, scheduleOpen: false, scheduleRefresh: 0,
  });
  const { active, history, loading, logVisible, scheduleOpen, scheduleRefresh } = state;

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch(`/api/members/${memberId}/nutrition`, { signal: controller.signal }).then((r) => r.json()),
      fetch(`/api/members/${memberId}/nutrition/history`, { signal: controller.signal }).then((r) => r.json()),
    ]).then(([a, h]: [IMemberNutritionPlan | null, IMemberNutritionPlan[]]) => {
      dispatch({ type: 'SET_ACTIVE', value: a });
      dispatch({ type: 'SET_HISTORY', value: h });
      dispatch({ type: 'SET_LOADING', value: false });
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError') console.error(err);
    });
    return () => controller.abort();
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
            <ChangePlanDialog
              templates={templates}
              triggerLabel="Change Plan"
            />
          )}
        </div>

        {loading ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="size-48 animate-pulse rounded bg-muted/60 mb-2" />
            <div className="size-32 animate-pulse rounded bg-muted/40" />
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
            <ChangePlanDialog
              templates={templates}
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
            <Sheet open={scheduleOpen} onOpenChange={(v) => dispatch({ type: 'SET_SCHEDULE_OPEN', value: v })}>
              <SheetTrigger className="flex items-center gap-1.5 text-[12px] text-foreground/45 hover:text-foreground/70 transition-colors bg-transparent border-none cursor-pointer">
                <Settings2 className="size-3.5" />
                Edit Schedule
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Edit Schedule</SheetTitle>
                  <p className="text-[12px] text-foreground/45 mt-1">
                    Changes to the weekly pattern take effect immediately. Date overrides can only be added from tomorrow onwards: today&apos;s schedule is locked.
                  </p>
                </SheetHeader>
                <ScheduleEditor
                  key={scheduleRefresh}
                  memberId={memberId}
                  dayTypeNames={active.dayTypes.map((d) => d.name)}
                  initialSchedule={active.schedule}
                  mode="edit"
                  onSave={() => { dispatch({ type: 'SET_SCHEDULE_OPEN', value: false }); dispatch({ type: 'SET_SCHEDULE_REFRESH', value: scheduleRefresh + 1 }); }}
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
              onClick={() => dispatch({ type: 'SET_LOG_VISIBLE', value: logVisible + 10 })}
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

function ChangePlanDialog({
  templates,
  triggerLabel,
}: {
  templates: TemplateOption[];
  triggerLabel: string;
}) {
  const { push } = useRouter();
  const { basePath } = useMemberHub();
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  function handleOpen(): void {
    const url = selectedId
      ? `${basePath}/nutrition/new?templateId=${selectedId}`
      : `${basePath}/nutrition/new`;
    push(url);
    setOpen(false);
  }

  const selectedName = templates.find((t) => t._id === selectedId)?.name;

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
        <DialogTitle>Change Nutrition Plan</DialogTitle>
        <p className="text-xs text-foreground/65 -mt-1">
          Pre-fill from a template, or leave blank to start from scratch.
        </p>
        <div className="space-y-3 mt-2">
          <Label className="text-xs font-medium text-foreground/80">
            Template <span className="text-foreground/45">(optional)</span>
          </Label>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                aria-controls="nutrition-search-listbox"
                className="w-full justify-between text-sm font-normal text-foreground/70"
              >
                {selectedName ?? 'Search templates...'}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            } />
            {comboOpen && (
              <PopoverPortal>
                <PopoverPositioner align="start">
                  <PopoverPopup className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search templates..." />
                      <CommandList id="nutrition-search-listbox">
                        <CommandEmpty>No templates found.</CommandEmpty>
                        <CommandGroup>
                          {templates.map((t) => (
                            <CommandItem
                              key={t._id}
                              value={t.name}
                              onSelect={() => {
                                setSelectedId((prev) => (prev === t._id ? '' : t._id));
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn('mr-2 size-4', selectedId === t._id ? 'opacity-100' : 'opacity-0')}
                              />
                              {t.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverPopup>
                </PopoverPositioner>
              </PopoverPortal>
            )}
          </Popover>

          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId('')}
              className="text-xs text-foreground/45 hover:text-foreground/70 transition-colors"
            >
              Clear selection
            </button>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={handleOpen} className="text-xs font-semibold">
              Open Editor →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
