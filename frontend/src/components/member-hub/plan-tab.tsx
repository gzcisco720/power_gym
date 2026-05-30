import { useState, useEffect, useReducer } from 'react';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SectionHeader } from '@/components/shared/section-header';
import { assignPlan } from '@/api/member-hub';
import type { MemberPlanData, SessionSummary, PlanTemplate } from '@/api/member-hub';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} ton`;
  return `${kg} kg`;
}

function dayAccentBg(dayName: string): string {
  const n = dayName.toLowerCase();
  if (n.includes('push')) return 'bg-primary/50';
  if (n.includes('pull')) return 'bg-emerald-500/50';
  if (n.includes('legs') || n.includes('leg')) return 'bg-amber-500/50';
  if (n.includes('upper')) return 'bg-purple-500/50';
  if (n.includes('lower')) return 'bg-orange-500/50';
  const palette = ['bg-sky-500/50', 'bg-pink-500/50', 'bg-violet-500/50'];
  let h = 0;
  for (let i = 0; i < dayName.length; i++) h += dayName.charCodeAt(i);
  return palette[h % palette.length];
}

function groupByMonth(sessions: SessionSummary[]): { label: string; sessions: SessionSummary[] }[] {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([label, sessions]) => ({ label, sessions }));
}

interface PeekSheetProps {
  session: SessionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SessionPeekSheet({ session, open, onOpenChange }: PeekSheetProps) {
  if (!session) return null;
  const date = new Date(session.startedAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const isActive = session.completedAt === null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-l border-border/60 px-5 pb-6 pt-5 w-full sm:max-w-md flex flex-col gap-5"
      >
        <div>
          <SheetTitle className="text-base font-semibold text-foreground">
            {session.dayName}
          </SheetTitle>
          <p className="mt-0.5 text-xs text-foreground/65">{date}</p>
          {isActive && (
            <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30">
              Active
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">Exercises</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">{session.exerciseCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">Sets</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">{session.setCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/65 font-semibold">Volume</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.totalVolume.toLocaleString()}
              <span className="ml-1 text-xs font-medium text-foreground/65">kg</span>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChangePlanDialog({
  templates,
  memberId,
  onAssigned,
  triggerLabel = 'Change Plan',
}: {
  templates: PlanTemplate[];
  memberId: string;
  onAssigned: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function handleAssign() {
    if (!selectedTemplate) return;
    setAssigning(true);
    try {
      await assignPlan(memberId, selectedTemplate);
      toast.success('Plan assigned');
      setSelectedTemplate('');
      setOpen(false);
      onAssigned();
    } catch {
      toast.error('Failed to assign plan');
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
        <DialogTitle>Assign Plan</DialogTitle>
        <p className="text-xs text-foreground/65 -mt-1">
          Replaces the current active plan. Session history is kept.
        </p>
        <div className="space-y-3 mt-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            aria-label="Select plan template"
            className="w-full rounded-md bg-muted border border-border/60 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="" disabled>Select a plan template</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={handleAssign}
              disabled={!selectedTemplate || assigning}
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

interface State {
  selectedDay: number;
  peekSession: SessionSummary | null;
  visibleCount: number;
}

type Action =
  | { type: 'SET_SELECTED_DAY'; value: number }
  | { type: 'SET_PEEK_SESSION'; value: SessionSummary | null }
  | { type: 'SET_VISIBLE_COUNT'; value: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SELECTED_DAY': return { ...state, selectedDay: action.value };
    case 'SET_PEEK_SESSION': return { ...state, peekSession: action.value };
    case 'SET_VISIBLE_COUNT': return { ...state, visibleCount: action.value };
    default: return state;
  }
}

interface PlanTabProps {
  memberId: string;
  data: MemberPlanData;
  onPlanAssigned: () => void;
}

export function PlanTab({ memberId, data, onPlanAssigned }: PlanTabProps) {
  const { active: activePlan, templates, sessions, pbs } = data;

  const [state, dispatch] = useReducer(reducer, {
    selectedDay: activePlan?.days[0]?.dayNumber ?? 1,
    peekSession: null,
    visibleCount: 8,
  });
  const { selectedDay, peekSession, visibleCount } = state;

  useEffect(() => {
    dispatch({ type: 'SET_VISIBLE_COUNT', value: 8 });
  }, [sessions]);

  function pbGridCols(count: number): string {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 4) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-2 lg:grid-cols-3';
  }

  return (
    <div className="space-y-8 py-6">
      <section className="px-4 sm:px-8">
        <SectionHeader title="Current Plan" />
        {activePlan ? (
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{activePlan.name}</p>
                <p className="mt-1 text-xs text-foreground/65">
                  {activePlan.days.length} {activePlan.days.length === 1 ? 'day' : 'days'}
                  <span className="mx-1.5 text-foreground/40">·</span>
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} logged
                  <span className="mx-1.5 text-foreground/40">·</span>
                  Assigned {formatDate(activePlan.assignedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={selectedDay}
                  onChange={(e) => dispatch({ type: 'SET_SELECTED_DAY', value: Number(e.target.value) })}
                  aria-label="Select day to log"
                  className="rounded-md bg-muted border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {activePlan.days.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      Day {d.dayNumber}: {d.name}
                    </option>
                  ))}
                </select>
                <a
                  href={`/trainer/members/${memberId}/log/new?day=${selectedDay}`}
                  className="inline-flex items-center rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  Log Workout
                </a>
                <ChangePlanDialog
                  templates={templates}
                  memberId={memberId}
                  onAssigned={onPlanAssigned}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/65">No plan assigned</p>
            <ChangePlanDialog
              templates={templates}
              memberId={memberId}
              onAssigned={onPlanAssigned}
              triggerLabel="Assign Plan"
            />
          </div>
        )}
      </section>

      {pbs.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Personal Bests" />
          <div className={`mt-3 grid gap-3 ${pbGridCols(pbs.length)}`}>
            {pbs.map((pb) => {
              const isBodyweight = pb.bestWeight === 0;
              return (
                <div key={pb.exerciseName} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                    {pb.exerciseName}
                  </p>
                  {isBodyweight ? (
                    <>
                      <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                        {pb.bestReps}
                        <span className="ml-1 text-sm font-medium text-foreground/65">reps</span>
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/65">Bodyweight</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                        {pb.bestWeight}
                        <span className="ml-1 text-sm font-medium text-foreground/65">kg</span>
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/65">
                        {pb.bestReps} reps
                        <span className="mx-1.5 text-foreground/40">·</span>
                        est. 1RM {pb.estimatedOneRM.toFixed(1)} kg
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Session History" />
          <div className="mt-3 space-y-5">
            {groupByMonth(sessions.slice(0, visibleCount)).map(({ label, sessions: group }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
                    {label}
                  </span>
                  <span className="text-[11px] text-foreground/25">
                    {group.length} {group.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {group.map((s) => {
                    const isActive = s.completedAt === null;
                    const date = formatDate(s.startedAt);
                    return (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'SET_PEEK_SESSION', value: s })}
                          className="w-full rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-colors flex items-stretch text-left cursor-pointer overflow-hidden"
                        >
                          <div className={`w-1 shrink-0 ${dayAccentBg(s.dayName)}`} />
                          <div className="flex items-center flex-1 px-3 py-2">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{s.dayName}</span>
                              <span className="text-xs text-foreground/40">·</span>
                              <span className="text-xs text-foreground/65">{date}</span>
                              {isActive && (
                                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30 shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="ml-auto flex items-center gap-3 shrink-0 text-xs text-foreground/65 tabular-nums">
                              <span>{s.exerciseCount} ex</span>
                              <span className="text-foreground/40">·</span>
                              <span>{s.setCount} sets</span>
                              {s.totalVolume > 0 && (
                                <>
                                  <span className="text-foreground/40">·</span>
                                  <span>{formatVolume(s.totalVolume)}</span>
                                </>
                              )}
                              <ChevronRight className="size-3.5 text-foreground/30 ml-1" />
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {sessions.length > visibleCount && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VISIBLE_COUNT', value: visibleCount + 8 })}
              className="mt-4 w-full rounded-xl border border-foreground/10 py-2.5 text-sm text-foreground/50 hover:text-foreground/75 hover:border-foreground/20 transition-colors"
            >
              Show {Math.min(8, sessions.length - visibleCount)} more sessions
            </button>
          )}

          <SessionPeekSheet
            session={peekSession}
            open={peekSession !== null}
            onOpenChange={(open) => {
              if (!open) dispatch({ type: 'SET_PEEK_SESSION', value: null });
            }}
          />
        </section>
      )}
    </div>
  );
}

