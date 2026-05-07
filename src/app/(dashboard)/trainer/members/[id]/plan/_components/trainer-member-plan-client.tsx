'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { SessionPeekSheet } from './session-peek-sheet';
import type { SessionSummary } from '@/lib/training/session-summary';

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
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
}

interface Props {
  memberId: string;
  memberName?: string;
  templates: Template[];
  activePlan: ActivePlan | null;
  sessions: SessionSummary[];
  pbs: PB[];
}

export function TrainerMemberPlanClient({ memberId, templates, activePlan, sessions, pbs }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(activePlan?.days[0]?.dayNumber ?? 1);
  const [peekSession, setPeekSession] = useState<SessionSummary | null>(null);

  async function assignPlan(): Promise<boolean> {
    if (!selectedTemplate) return false;
    setAssigning(true);
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
      setSelectedTemplate('');
      router.refresh();
      return true;
    } catch {
      toast.error('Something went wrong');
      return false;
    } finally {
      setAssigning(false);
    }
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
                  Assigned {new Date(activePlan.assignedAt).toLocaleDateString('en-US')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  aria-label="Select day to log"
                  className="rounded-md bg-muted border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {activePlan.days.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      Day {d.dayNumber} — {d.name}
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
                  assigning={assigning}
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
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
              onSelect={setSelectedTemplate}
              onAssign={assignPlan}
              triggerLabel="Assign Plan"
            />
          </div>
        )}
      </section>

      {pbs.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Personal Bests" />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pbs.map((pb) => (
              <div
                key={pb.exerciseName}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                  {pb.exerciseName}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                  {pb.bestWeight}
                  <span className="ml-1 text-sm font-medium text-foreground/65">kg</span>
                </p>
                <p className="mt-0.5 text-xs text-foreground/65">
                  {pb.bestReps} reps
                  <span className="mx-1.5 text-foreground/40">·</span>
                  est. 1RM {pb.estimatedOneRM.toFixed(1)} kg
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Session History" />
          <ul className="mt-3 space-y-1.5">
            {sessions.map((s) => {
              const isActive = s.completedAt === null;
              const date = new Date(s.startedAt).toLocaleDateString('en-US');
              return (
                <li key={s._id}>
                  <button
                    type="button"
                    onClick={() => setPeekSession(s)}
                    className="w-full rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 hover:ring-foreground/25 transition-colors flex items-center text-left cursor-pointer"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{s.dayName}</span>
                      <span className="text-xs text-foreground/65">·</span>
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
                          <span>{(s.totalVolume / 1000).toFixed(1)} t</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <SessionPeekSheet
            memberId={memberId}
            session={peekSession}
            open={peekSession !== null}
            onOpenChange={(open) => {
              if (!open) setPeekSession(null);
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
