import { useState, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SectionHeader } from '@/components/shared/section-header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { patchNutritionSchedule } from '@/api/member-hub';
import type {
  MemberNutritionData,
  NutritionTemplate,
  ActiveNutritionPlan,
  NutritionSchedule,
  WeeklyPatternEntry,
  CalendarOverride,
  DayTypeTarget,
} from '@/api/member-hub';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;

function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function computeDayMacros(dayType: ActiveNutritionPlan['dayTypes'][number]) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const meal of dayType.meals as { items: { kcal: number; protein: number; carbs: number; fat: number }[] }[]) {
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

// ─── Schedule Editor ─────────────────────────────────────────────────────────

const DAY_VALUES = [0,1,2,3,4,5,6] as const;
type DayOfWeek = (typeof DAY_VALUES)[number];
const NONE = '__none__';

interface ScheduleEditorProps {
  memberId: string;
  dayTypeNames: string[];
  initialSchedule: NutritionSchedule;
  onSave: () => void;
}

interface ScheduleEditorState {
  weekly: Record<DayOfWeek, string>;
  iterate: boolean;
  overrides: CalendarOverride[];
  newDate: string;
  newDayType: string;
  saving: boolean;
}

type ScheduleEditorAction =
  | { type: 'SET_WEEKLY'; value: Record<DayOfWeek, string> }
  | { type: 'SET_ITERATE'; value: boolean }
  | { type: 'SET_OVERRIDES'; value: CalendarOverride[] }
  | { type: 'SET_NEW_DATE'; value: string }
  | { type: 'SET_NEW_DAY_TYPE'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function scheduleEditorReducer(state: ScheduleEditorState, action: ScheduleEditorAction): ScheduleEditorState {
  switch (action.type) {
    case 'SET_WEEKLY': return { ...state, weekly: action.value };
    case 'SET_ITERATE': return { ...state, iterate: action.value };
    case 'SET_OVERRIDES': return { ...state, overrides: action.value };
    case 'SET_NEW_DATE': return { ...state, newDate: action.value };
    case 'SET_NEW_DAY_TYPE': return { ...state, newDayType: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

function ScheduleEditor({ memberId, dayTypeNames, initialSchedule, onSave }: ScheduleEditorProps) {
  const [state, dispatch] = useReducer(scheduleEditorReducer, undefined, () => {
    const patternMap = new Map(initialSchedule.weeklyPattern.map((w) => [w.dayOfWeek, w.dayTypeName]));
    const map = {} as Record<DayOfWeek, string>;
    for (const d of DAY_VALUES) {
      map[d] = patternMap.get(d) ?? NONE;
    }
    return {
      weekly: map,
      iterate: initialSchedule.iterate,
      overrides: initialSchedule.calendarOverrides,
      newDate: '',
      newDayType: dayTypeNames[0] ?? '',
      saving: false,
    };
  });
  const { weekly, iterate, overrides, newDate, newDayType, saving } = state;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  function addOverride(): void {
    if (!newDate || !newDayType || newDate < minDateStr) return;
    dispatch({
      type: 'SET_OVERRIDES',
      value: [...overrides, { date: newDate, dayTypeName: newDayType }].sort((a, b) => a.date.localeCompare(b.date)),
    });
    dispatch({ type: 'SET_NEW_DATE', value: '' });
  }

  function removeOverride(date: string): void {
    dispatch({ type: 'SET_OVERRIDES', value: overrides.filter((o) => o.date !== date) });
  }

  async function save(): Promise<void> {
    dispatch({ type: 'SET_SAVING', value: true });
    const weeklyPattern: WeeklyPatternEntry[] = DAY_VALUES.flatMap((d) =>
      weekly[d] !== NONE ? [{ dayOfWeek: d, dayTypeName: weekly[d] }] : [],
    );
    const builtSchedule: NutritionSchedule = { weeklyPattern, calendarOverrides: overrides, iterate };
    try {
      await patchNutritionSchedule(memberId, builtSchedule);
      onSave();
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {DAY_VALUES.map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-[12px] font-medium text-foreground/50">{DAY_LABELS[d]}</span>
            <Select
              value={weekly[d]}
              onValueChange={(v) => dispatch({ type: 'SET_WEEKLY', value: { ...weekly, [d]: v ?? NONE } })}
            >
              <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2.5 text-sm cursor-pointer text-foreground/80">
        <input
          type="checkbox"
          checked={iterate}
          onChange={(e) => dispatch({ type: 'SET_ITERATE', value: e.target.checked })}
          aria-label="Iterate weekly"
          className="rounded"
        />
        Auto-roll to subsequent weeks
      </label>

      <div className="space-y-3 border-t border-foreground/8 pt-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Date Overrides</div>
        {overrides.length > 0 && (
          <div className="space-y-1.5">
            {overrides.map((o) => (
              <div key={o.date} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="text-foreground/60 font-medium tabular-nums">{o.date}</span>
                <span className="text-foreground/30 mx-0.5">→</span>
                <span className="text-foreground/80 flex-1">{o.dayTypeName}</span>
                <button type="button" onClick={() => removeOverride(o.date)} className="text-foreground/30 hover:text-destructive transition-colors" aria-label={`Remove override for ${o.date}`}>×</button>
              </div>
            ))}
          </div>
        )}
        {overrides.length === 0 && <p className="text-sm text-foreground/35">No date overrides set.</p>}
        <div className="flex gap-2">
          <Input type="date" value={newDate} min={minDateStr} onChange={(e) => dispatch({ type: 'SET_NEW_DATE', value: e.target.value })} className="flex-1 h-9 text-sm" />
          <Select value={newDayType} onValueChange={(v) => dispatch({ type: 'SET_NEW_DAY_TYPE', value: v ?? '' })}>
            <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={addOverride} disabled={!newDate || !newDayType} size="sm" className="h-9 px-4">Add</Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save Schedule'}</Button>
    </div>
  );
}

// ─── ChangePlanDialog ────────────────────────────────────────────────────────

function ChangePlanDialog({
  templates,
  basePath,
  triggerLabel,
}: {
  templates: NutritionTemplate[];
  basePath: string;
  triggerLabel: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const selectedName = templates.find((t) => t._id === selectedId)?.name;

  function handleOpen(): void {
    const url = selectedId
      ? `${basePath}/nutrition/new?templateId=${selectedId}`
      : `${basePath}/nutrition/new`;
    navigate(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs font-medium">{triggerLabel}</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Change Nutrition Plan</DialogTitle>
        <p className="text-xs text-foreground/65 -mt-1">Pre-fill from a template, or leave blank to start from scratch.</p>
        <div className="space-y-3 mt-2">
          <Label className="text-xs font-medium text-foreground/80">Template <span className="text-foreground/45">(optional)</span></Label>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger render={
              <Button variant="outline" role="combobox" aria-expanded={comboOpen} aria-controls="nutrition-template-listbox" className="w-full justify-between text-sm font-normal text-foreground/70">
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
                      <CommandList id="nutrition-template-listbox">
                        <CommandEmpty>No templates found.</CommandEmpty>
                        <CommandGroup>
                          {templates.map((t) => (
                            <CommandItem key={t._id} value={t.name} onSelect={() => { setSelectedId((prev) => prev === t._id ? '' : t._id); setComboOpen(false); }}>
                              <Check className={cn('mr-2 size-4', selectedId === t._id ? 'opacity-100' : 'opacity-0')} />
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
            <button type="button" onClick={() => setSelectedId('')} className="text-xs text-foreground/45 hover:text-foreground/70 transition-colors">Clear selection</button>
          )}
          <div className="flex justify-end pt-1">
            <Button onClick={handleOpen} className="text-xs font-semibold">Open Editor →</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── NutritionTab ─────────────────────────────────────────────────────────────

interface NutritionTabState {
  scheduleOpen: boolean;
  scheduleRefresh: number;
  logVisible: number;
}

type NutritionTabAction =
  | { type: 'SET_SCHEDULE_OPEN'; value: boolean }
  | { type: 'INC_SCHEDULE_REFRESH' }
  | { type: 'SET_LOG_VISIBLE'; value: number };

function nutritionTabReducer(state: NutritionTabState, action: NutritionTabAction): NutritionTabState {
  switch (action.type) {
    case 'SET_SCHEDULE_OPEN': return { ...state, scheduleOpen: action.value };
    case 'INC_SCHEDULE_REFRESH': return { ...state, scheduleRefresh: state.scheduleRefresh + 1 };
    case 'SET_LOG_VISIBLE': return { ...state, logVisible: action.value };
    default: return state;
  }
}

interface NutritionTabProps {
  memberId: string;
  basePath: string;
  data: MemberNutritionData;
  onRefresh: () => void;
}

export function NutritionTab({ memberId, basePath, data, onRefresh }: NutritionTabProps) {
  const { active, history, templates, recentLogs, dayTypeTargets } = data;

  const [state, dispatch] = useReducer(nutritionTabReducer, {
    scheduleOpen: false,
    scheduleRefresh: 0,
    logVisible: 10,
  });
  const { scheduleOpen, scheduleRefresh, logVisible } = state;

  const weeklyPattern = active?.schedule.weeklyPattern ?? [];
  const calendarOverrides = active?.schedule.calendarOverrides ?? [];

  return (
    <div className="space-y-8 py-6">
      {/* ── Current Plan ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
          {active && (
            <ChangePlanDialog templates={templates} basePath={basePath} triggerLabel="Change Plan" />
          )}
        </div>

        {active ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-4">
            <div>
              <p className="text-[17px] font-bold text-foreground leading-tight">{active.name}</p>
              <p className="mt-1 text-[12px] text-foreground/45">
                {active.dayTypes.length} day {active.dayTypes.length === 1 ? 'type' : 'types'}
                <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
                Assigned {formatDate(active.assignedAt)}
              </p>
            </div>
            {active.dayTypes.length > 0 && (
              <div className={`grid gap-3 ${active.dayTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {active.dayTypes.map((dt) => {
                  const m = computeDayMacros(dt);
                  return (
                    <div key={dt.name} className="rounded-lg bg-muted/40 border border-foreground/8 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-foreground">{dt.name}</span>
                        <span className="text-[11px] text-foreground/40">
                          {(dt.meals as unknown[]).length} {(dt.meals as unknown[]).length === 1 ? 'meal' : 'meals'}
                        </span>
                      </div>
                      <div className="text-[22px] font-bold text-foreground leading-none mb-2">
                        {m.kcal.toLocaleString()}
                        <span className="text-[12px] font-medium text-foreground/45 ml-1">kcal</span>
                      </div>
                      <div className="flex gap-3 text-[12px]">
                        <span><span className="font-semibold text-emerald-400">{m.protein}g</span><span className="text-foreground/40 ml-1">protein</span></span>
                        <span><span className="font-semibold text-amber-400">{m.carbs}g</span><span className="text-foreground/40 ml-1">carbs</span></span>
                        <span><span className="font-semibold text-rose-400">{m.fat}g</span><span className="text-foreground/40 ml-1">fat</span></span>
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
            <ChangePlanDialog templates={templates} basePath={basePath} triggerLabel="Assign Plan" />
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
                    Changes to the weekly pattern take effect immediately. Date overrides can only be added from tomorrow onwards.
                  </p>
                </SheetHeader>
                <ScheduleEditor
                  key={scheduleRefresh}
                  memberId={memberId}
                  dayTypeNames={active.dayTypes.map((d) => d.name)}
                  initialSchedule={active.schedule}
                  onSave={() => {
                    dispatch({ type: 'SET_SCHEDULE_OPEN', value: false });
                    dispatch({ type: 'INC_SCHEDULE_REFRESH' });
                    onRefresh();
                  }}
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
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/35">{DAY_LABELS[d]}</span>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium text-center ${entry ? 'bg-primary/12 text-primary-light border border-primary/20' : 'bg-muted/50 text-foreground/25 border border-foreground/8'}`}>
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/35 mb-2">Date Overrides</p>
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
          </div>
        </section>
      )}

      {/* ── Adherence Log ────────────────────────────────────────── */}
      {recentLogs.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Adherence Log (last 30 days)" />
          <ul className="mt-3 space-y-1.5">
            {recentLogs.slice(0, logVisible).map((log) => {
              const target: DayTypeTarget | undefined = dayTypeTargets[log.dayTypeName];
              const d = new Date(log.date + 'T00:00:00');
              const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <li key={log.date} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
                      <span className="text-[11px] text-foreground/40 bg-muted rounded-full px-2 py-0.5">{log.dayTypeName}</span>
                    </div>
                    {log.dayCompleted && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">✓ Completed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span>
                      <span className="font-semibold text-foreground">{log.actualKcal.toLocaleString()}</span>
                      <span className="text-foreground/40 ml-0.5">kcal</span>
                      {target && <span className="text-foreground/30 ml-1">/ {target.kcal.toLocaleString()}</span>}
                    </span>
                    <span>
                      <span className="font-semibold text-emerald-400">{log.actualProtein}g</span>
                      <span className="text-foreground/40 ml-0.5">prot</span>
                      {target && <span className="text-foreground/30 ml-1">/ {target.protein}g</span>}
                    </span>
                    <span>
                      <span className="font-semibold text-amber-400">{log.actualCarbs}g</span>
                      <span className="text-foreground/40 ml-0.5">carbs</span>
                      {target && <span className="text-foreground/30 ml-1">/ {target.carbs}g</span>}
                    </span>
                    <span>
                      <span className="font-semibold text-rose-400">{log.actualFat}g</span>
                      <span className="text-foreground/40 ml-0.5">fat</span>
                      {target && <span className="text-foreground/30 ml-1">/ {target.fat}g</span>}
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
              <li key={p._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                {p.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">Active</span>
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
