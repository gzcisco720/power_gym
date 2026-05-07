'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';

interface TemplateOption {
  _id: string;
  name: string;
}

interface Props {
  memberId: string;
  templates: TemplateOption[];
}

export function TrainerMemberNutritionClient({ memberId, templates }: Props) {
  const [active, setActive] = useState<IMemberNutritionPlan | null>(null);
  const [history, setHistory] = useState<IMemberNutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [memberId]);

  return (
    <div className="space-y-8 py-6">
      <section className="px-4 sm:px-8">
        <SectionHeader title="Current Plan" />
        {loading ? (
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
          </div>
        ) : active ? (
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{active.name}</p>
                <p className="mt-1 text-xs text-foreground/65">
                  {active.dayTypes.length} {active.dayTypes.length === 1 ? 'day type' : 'day types'}
                  <span className="mx-1.5 text-foreground/40">·</span>
                  Assigned {new Date(active.assignedAt).toLocaleDateString('en-US')}
                </p>
              </div>
              <AssignDialog
                templates={templates}
                memberId={memberId}
                onAssigned={(next) => {
                  setActive(next);
                  setHistory((h) => [next, ...h]);
                }}
                triggerLabel="Change Plan"
              />
            </div>

            {active.dayTypes.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {active.dayTypes.map((d) => (
                  <li key={d.name} className="flex items-center text-sm">
                    <span className="text-foreground">{d.name}</span>
                    <span className="ml-auto text-xs text-foreground/65 tabular-nums">
                      {d.meals.length} {d.meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/65">No nutrition plan assigned</p>
            <AssignDialog
              templates={templates}
              memberId={memberId}
              onAssigned={(next) => {
                setActive(next);
                setHistory((h) => [next, ...h]);
              }}
              triggerLabel="Assign Plan"
            />
          </div>
        )}
      </section>

      {active && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="Schedule" />
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <ScheduleEditor
              memberId={memberId}
              dayTypeNames={active.dayTypes.map((d) => d.name)}
              initialSchedule={active.schedule}
            />
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="px-4 sm:px-8">
          <SectionHeader title="History" />
          <ul className="mt-3 space-y-1.5">
            {history.map((p) => {
              const id = String(p._id);
              return (
                <li
                  key={id}
                  className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center"
                >
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  {p.isActive && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                      Active
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs text-foreground/65 tabular-nums">
                    <span>{new Date(p.assignedAt).toLocaleDateString('en-US')}</span>
                    <span className="text-foreground/40">·</span>
                    <span>{p.dayTypes.length} day {p.dayTypes.length === 1 ? 'type' : 'types'}</span>
                  </div>
                </li>
              );
            })}
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
            <option value="" disabled>
              Select a nutrition template
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
