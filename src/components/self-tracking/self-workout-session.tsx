'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import { CompleteWorkoutDialog } from './complete-workout-dialog';

interface Props {
  logId: string;
  basePath: '/owner/my-training' | '/trainer/my-training';
}

export function SelfWorkoutSession({ logId, basePath }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<ISelfWorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeOpen, setCompleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs/${logId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ISelfWorkoutLog | null) => {
        if (!cancelled) {
          setLog(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logId]);

  if (loading) return <div className="p-6 text-foreground/65 text-sm">Loading…</div>;
  if (!log) return <div className="p-6 text-foreground/65 text-sm">Workout not found.</div>;

  return (
    <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="text-foreground/65 text-sm hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold">{log.dayName}</h1>
        </div>
        <Button onClick={() => setCompleteOpen(true)} variant="default">
          Finish
        </Button>
      </div>

      <SetGroups log={log} logId={logId} onUpdate={setLog} />

      {log.sourceTemplateId === null && (
        <Button
          variant="outline"
          className="w-full"
          // TODO: open exercise picker (placeholder until later wiring)
          onClick={() => alert('Add Exercise picker coming later')}
        >
          + Add Exercise
        </Button>
      )}

      <CompleteWorkoutDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        logId={logId}
        onCompleted={() => router.push(`${basePath}/calendar`)}
      />
    </div>
  );
}

interface SetGroupsProps {
  log: ISelfWorkoutLog;
  logId: string;
  onUpdate: (log: ISelfWorkoutLog) => void;
}

function SetGroups({ log, logId, onUpdate }: SetGroupsProps) {
  const groups = groupSetsByGroupId(log.sets);

  async function patchSet(
    globalSetIndex: number,
    actualWeight: number | null,
    actualReps: number | null,
  ) {
    const res = await fetch(`/api/me/workout-logs/${logId}/sets/${globalSetIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualWeight, actualReps }),
    });
    if (res.ok) onUpdate((await res.json()) as ISelfWorkoutLog);
  }

  async function addSetToGroup(group: ISelfWorkoutSet[]) {
    const last = group[group.length - 1];
    const newSet: ISelfWorkoutSet = {
      ...last,
      setNumber: last.setNumber + 1,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await fetch(`/api/me/workout-logs/${logId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet),
    });
    if (res.ok) onUpdate((await res.json()) as ISelfWorkoutLog);
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={gi} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2">
          <div className="text-sm font-medium">
            {group[0].exerciseName}
            {group[0].isSuperset && (
              <span className="ml-2 text-[10px] text-foreground/65">superset</span>
            )}
          </div>
          <div className="mt-1.5 space-y-1">
            {group.map((s) => (
              <SetRow
                key={`${s.groupId}-${s.setNumber}`}
                set={s}
                onSave={(w, r) => patchSet(log.sets.indexOf(s), w, r)}
              />
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1.5 text-foreground/65"
            onClick={() => addSetToGroup(group)}
          >
            + Add Set
          </Button>
        </div>
      ))}
    </div>
  );
}

function groupSetsByGroupId(sets: ISelfWorkoutSet[]): ISelfWorkoutSet[][] {
  const map = new Map<string, ISelfWorkoutSet[]>();
  for (const s of sets) {
    const arr = map.get(s.groupId) ?? [];
    arr.push(s);
    map.set(s.groupId, arr);
  }
  return Array.from(map.values());
}

interface SetRowProps {
  set: ISelfWorkoutSet;
  onSave: (weight: number | null, reps: number | null) => Promise<void>;
}

function SetRow({ set, onSave }: SetRowProps) {
  const [w, setW] = useState<string>(set.actualWeight?.toString() ?? '');
  const [r, setR] = useState<string>(set.actualReps?.toString() ?? '');

  const isCompleted = set.completedAt !== null;

  function commit() {
    const weight = w === '' ? null : parseFloat(w);
    const reps = r === '' ? null : parseInt(r, 10);
    void onSave(weight, reps);
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-foreground/65">#{set.setNumber}</span>
      {set.prescribedRepsMin !== null && set.prescribedRepsMax !== null && (
        <span className="w-16 text-foreground/65">
          {set.prescribedRepsMin}–{set.prescribedRepsMax}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        placeholder="kg"
        aria-label="Weight in kilograms"
        value={w}
        onChange={(e) => setW(e.target.value)}
        onBlur={commit}
        className="w-16 bg-background ring-1 ring-foreground/10 rounded px-2 py-1"
      />
      <span className="text-foreground/65">×</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="reps"
        aria-label="Reps"
        value={r}
        onChange={(e) => setR(e.target.value)}
        onBlur={commit}
        className="w-14 bg-background ring-1 ring-foreground/10 rounded px-2 py-1"
      />
      {isCompleted && (
        <span className="text-emerald-500 ml-1" aria-label="completed">
          ✓
        </span>
      )}
    </div>
  );
}
