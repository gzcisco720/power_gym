'use client';

import { useRef, useState, useEffect, useReducer } from 'react';
import { useMemberHub } from '../../_components/member-hub-provider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';
import { SessionPeekSheet } from './session-peek-sheet';
import type { SessionSummary } from '@/lib/training/session-summary';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} ton`;
  return `${kg} kg`;
}

// Returns a full static Tailwind bg class for the left-bar color indicator.
// All strings are complete class names so Tailwind's scanner can detect them.
function dayAccentBg(dayName: string): string {
  const n = dayName.toLowerCase();
  if (n.includes('push'))  return 'bg-primary/50';
  if (n.includes('pull'))  return 'bg-emerald-500/50';
  if (n.includes('legs') || n.includes('leg')) return 'bg-amber-500/50';
  if (n.includes('upper')) return 'bg-purple-500/50';
  if (n.includes('lower')) return 'bg-orange-500/50';
  const palette = ['bg-sky-500/50', 'bg-pink-500/50', 'bg-violet-500/50'];
  let h = 0;
  for (let i = 0; i < dayName.length; i++) h += dayName.charCodeAt(i);
  return palette[h % palette.length];
}

function groupByMonth(
  sessions: SessionSummary[],
): { label: string; sessions: SessionSummary[] }[] {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([label, sessions]) => ({ label, sessions }));
}

function pbGridCols(count: number): string {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 4) return 'grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-2 lg:grid-cols-3';
}

interface Template {
  _id: string;
  name: string;
}
interface ActivePlan {
  _id: string;
  name: string;
  days: { dayNumber: number; name: string; exercises: object[] }[];
  assignedAt: string;
}
interface PB {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
}

interface ActiveConflict {
  sessionId: string;
  dayName: string;
}

interface ActivePromptInfo {
  sessionId: string;
  dayName: string;
  startedAtIso: string;
  lastActivityAtIso: string;
}

interface Props {
  memberId: string;
  templates: Template[];
  activePlan: ActivePlan | null;
  sessions: SessionSummary[];
  pbs: PB[];
  conflict?: ActiveConflict | null;
  activePrompt?: ActivePromptInfo | null;
}

interface HistoryPoint {
  date: string;
  estimatedOneRM: number;
  bestWeight: number;
  bestReps: number;
}

function ExerciseStrengthChart({
  memberId,
  exercises,
}: {
  memberId: string;
  exercises: { exerciseId: string; exerciseName: string }[];
}) {
  const [selectedId, setSelectedId] = useState(exercises[0]?.exerciseId ?? '');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/progress/${memberId}?exerciseId=${selectedId}`, { signal: controller.signal });
        if (!r.ok) throw new Error('Failed to fetch');
        const data = (await r.json()) as { history: HistoryPoint[] };
        setHistory(data.history ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') toast.error('Failed to load exercise history');
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [selectedId, memberId]);

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    estimatedOneRM: h.estimatedOneRM,
    bestWeight: h.bestWeight,
    bestReps: h.bestReps,
  }));

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65">
          Strength Progress
        </span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Select exercise for strength chart"
          className="rounded-md bg-muted border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {exercises.map((ex) => (
            <option key={ex.exerciseId} value={ex.exerciseId}>
              {ex.exerciseName}
            </option>
          ))}
        </select>
      </div>

      <div className={`transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
        {chartData.length === 0 ? (
          <p className="text-sm text-foreground/65 text-center py-8">
            No history yet for this exercise.
          </p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-foreground/65"
                  stroke="currentColor"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-foreground/65"
                  stroke="currentColor"
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)', fontSize: 10 }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: 11 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as typeof chartData[number];
                    return (
                      <div
                        style={{
                          backgroundColor: 'var(--popover)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 11,
                        }}
                      >
                        <p style={{ color: 'var(--muted-foreground)', fontSize: 10, marginBottom: 4 }}>
                          {label}
                        </p>
                        <p style={{ color: 'var(--foreground)' }}>
                          {d.bestWeight} kg × {d.bestReps} reps
                        </p>
                        <p style={{ color: 'rgba(165,180,252,1)', marginTop: 2 }}>
                          Est. 1RM: {d.estimatedOneRM} kg
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedOneRM"
                  stroke="rgb(99 102 241)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(99 102 241)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

interface TrainerMemberPlanClientState {
  selectedTemplate: string;
  assigning: boolean;
  selectedDay: number;
  peekSession: SessionSummary | null;
  conflictBanner: ActiveConflict | null;
  visibleCount: number;
}

type TrainerMemberPlanClientAction =
  | { type: 'SET_SELECTED_TEMPLATE'; value: string }
  | { type: 'SET_ASSIGNING'; value: boolean }
  | { type: 'SET_SELECTED_DAY'; value: number }
  | { type: 'SET_PEEK_SESSION'; value: SessionSummary | null }
  | { type: 'SET_CONFLICT_BANNER'; value: ActiveConflict | null }
  | { type: 'SET_VISIBLE_COUNT'; value: number };

function trainerMemberPlanClientReducer(state: TrainerMemberPlanClientState, action: TrainerMemberPlanClientAction): TrainerMemberPlanClientState {
  switch (action.type) {
    case 'SET_SELECTED_TEMPLATE': return { ...state, selectedTemplate: action.value };
    case 'SET_ASSIGNING': return { ...state, assigning: action.value };
    case 'SET_SELECTED_DAY': return { ...state, selectedDay: action.value };
    case 'SET_PEEK_SESSION': return { ...state, peekSession: action.value };
    case 'SET_CONFLICT_BANNER': return { ...state, conflictBanner: action.value };
    case 'SET_VISIBLE_COUNT': return { ...state, visibleCount: action.value };
    default: return state;
  }
}

export function TrainerMemberPlanClient({
  memberId,
  templates,
  activePlan,
  sessions,
  pbs,
  conflict,
  activePrompt,
}: Props) {
  const { refresh } = useRouter();
  const { basePath } = useMemberHub();
  const [state, dispatch] = useReducer(trainerMemberPlanClientReducer, undefined, () => ({
    selectedTemplate: '',
    assigning: false,
    selectedDay: activePlan?.days[0]?.dayNumber ?? 1,
    peekSession: null,
    conflictBanner: conflict ?? null,
    visibleCount: 8,
  }));
  const { selectedTemplate, assigning, selectedDay, peekSession, conflictBanner, visibleCount } = state;

  const prevSessionsRef = useRef(sessions);

  if (prevSessionsRef.current !== sessions) {
    prevSessionsRef.current = sessions;
    dispatch({ type: 'SET_VISIBLE_COUNT', value: 8 });
  }

  async function assignPlan(): Promise<boolean> {
    if (!selectedTemplate) return false;
    dispatch({ type: 'SET_ASSIGNING', value: true });
    try {
      const res = await fetch(`/api/members/${memberId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to assign plan');
        return false;
      }
      toast.success('Plan assigned');
      dispatch({ type: 'SET_SELECTED_TEMPLATE', value: '' });
      refresh();
      return true;
    } catch {
      toast.error('Something went wrong');
      return false;
    } finally {
      dispatch({ type: 'SET_ASSIGNING', value: false });
    }
  }

  return (
    <div className="space-y-8 py-6">
      {activePrompt && (
        <section className="px-4 sm:px-8">
          <ActiveSessionPrompt
            dayName={activePrompt.dayName}
            startedAtIso={activePrompt.startedAtIso}
            lastActivityAtIso={activePrompt.lastActivityAtIso}
            continueHref={`${basePath}/log/${activePrompt.sessionId}`}
            sealEndpoint={`/api/sessions/${activePrompt.sessionId}/seal`}
            deleteEndpoint={`/api/sessions/${activePrompt.sessionId}`}
          />
        </section>
      )}
      {conflictBanner && (
        <section className="px-4 sm:px-8">
          <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 px-4 py-3">
            <TriangleAlert className="size-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-100">
                You already have an active {conflictBanner.dayName} session
              </p>
              <p className="mt-0.5 text-xs text-foreground/65">
                Finish or discard it before starting a new day.
              </p>
            </div>
            <a
              href={`${basePath}/log/${conflictBanner.sessionId}`}
              className="shrink-0 inline-flex items-center rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-500/40 hover:bg-amber-500/30 transition-colors"
            >
              Open
            </a>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_CONFLICT_BANNER', value: null })}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-foreground/65 hover:text-foreground hover:bg-muted/50 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </section>
      )}

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
                  href={`${basePath}/log/new?day=${selectedDay}`}
                  className="inline-flex items-center rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  Log Workout
                </a>
                <ChangePlanDialog
                  templates={templates}
                  assigning={assigning}
                  selectedTemplate={selectedTemplate}
                  onSelect={(id) => dispatch({ type: 'SET_SELECTED_TEMPLATE', value: id })}
                  onAssign={assignPlan}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/65">No plan assigned</p>
            <ChangePlanDialog
              templates={templates}
              assigning={assigning}
              selectedTemplate={selectedTemplate}
              onSelect={(id) => dispatch({ type: 'SET_SELECTED_TEMPLATE', value: id })}
              onAssign={assignPlan}
              triggerLabel="Assign Plan"
            />
          </div>
        )}
      </section>

      {pbs.filter((pb) => pb.bestWeight > 0).length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Strength Progress" />
          <div className="mt-3">
            <ExerciseStrengthChart
              memberId={memberId}
              exercises={pbs
                .filter((pb) => pb.bestWeight > 0)
                .map((pb) => ({ exerciseId: pb.exerciseId, exerciseName: pb.exerciseName }))}
            />
          </div>
        </section>
      )}

      {pbs.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Personal Bests" />
          <div className={`mt-3 grid gap-3 ${pbGridCols(pbs.length)}`}>
            {pbs.map((pb) => {
              const isBodyweight = pb.bestWeight === 0;
              return (
                <div
                  key={pb.exerciseName}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
                >
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
            memberId={memberId}
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

function ChangePlanDialog({
  templates,
  assigning,
  selectedTemplate,
  onSelect,
  onAssign,
  triggerLabel = 'Change Plan',
}: {
  templates: Template[];
  assigning: boolean;
  selectedTemplate: string;
  onSelect: (id: string) => void;
  onAssign: () => Promise<boolean>;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  async function handleAssign() {
    const ok = await onAssign();
    if (ok) setOpen(false);
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
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Select plan template"
            className="w-full rounded-md bg-muted border border-border/60 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="" disabled>
              Select a plan template
            </option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
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
