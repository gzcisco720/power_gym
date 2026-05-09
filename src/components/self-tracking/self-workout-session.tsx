'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ExerciseRow,
  type ExerciseRowData,
  type LoggingSetInput,
} from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import { labelExercises } from '@/lib/training/label-exercises';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import { CompleteWorkoutDialog } from './complete-workout-dialog';

interface Props {
  logId: string;
  basePath: '/owner/my-training' | '/trainer/my-training';
}

interface SetWithIndex extends ISelfWorkoutSet {
  globalIndex: number;
}

type Group =
  | { type: 'standalone'; exerciseId: string; exercise: ExerciseRowData; sets: SetWithIndex[] }
  | {
      type: 'superset';
      groupId: string;
      exercises: { exerciseId: string; exercise: ExerciseRowData; sets: SetWithIndex[] }[];
    };

function buildGroups(log: ISelfWorkoutLog): Group[] {
  const setsWithIndex: SetWithIndex[] = log.sets.map((s, i) => ({ ...s, globalIndex: i }));

  const seenExerciseIds = new Set<string>();
  const exerciseRows: ExerciseRowData[] = [];
  for (const s of setsWithIndex) {
    const exId = s.exerciseId.toString();
    if (seenExerciseIds.has(exId)) continue;
    seenExerciseIds.add(exId);
    const exSets = setsWithIndex.filter((x) => x.exerciseId.toString() === exId);
    const maxSet = exSets.reduce((m, x) => Math.max(m, x.setNumber), 0);
    exerciseRows.push({
      exerciseId: exId,
      exerciseName: s.exerciseName,
      imageUrl: null,
      isBodyweight: s.isBodyweight,
      groupId: s.groupId,
      isSuperset: s.isSuperset,
      sets: maxSet,
      repsMin: s.prescribedRepsMin ?? 0,
      repsMax: s.prescribedRepsMax ?? 0,
      restSeconds: null,
    });
  }

  const labelled = labelExercises(exerciseRows);
  const groups: Group[] = [];
  const seenGroupIds = new Set<string>();

  for (const ex of labelled) {
    const exSets = setsWithIndex.filter((s) => s.exerciseId.toString() === ex.exerciseId);
    const exRow: ExerciseRowData = ex;
    if (!ex.isSuperset) {
      groups.push({
        type: 'standalone',
        exerciseId: ex.exerciseId,
        exercise: exRow,
        sets: exSets,
      });
    } else if (!seenGroupIds.has(ex.groupId)) {
      seenGroupIds.add(ex.groupId);
      const groupExercises = labelled
        .filter((e) => e.isSuperset && e.groupId === ex.groupId)
        .map((e) => ({
          exerciseId: e.exerciseId,
          exercise: e as ExerciseRowData,
          sets: setsWithIndex.filter((s) => s.exerciseId.toString() === e.exerciseId),
        }));
      groups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
    }
  }
  return groups;
}

function toLoggingSets(exSets: SetWithIndex[]): LoggingSetInput[] {
  return exSets.map((s) => ({
    setNumber: s.setNumber,
    prescribedRepsMin: s.prescribedRepsMin ?? 0,
    prescribedRepsMax: s.prescribedRepsMax ?? 0,
    actualWeight: s.actualWeight,
    actualReps: s.actualReps,
    completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : (s.completedAt ?? null),
    globalIndex: s.globalIndex,
  }));
}

export function SelfWorkoutSession({ logId, basePath }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<ISelfWorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [inputs, setInputs] = useState<{ weight: string; reps: string }[]>([]);
  const [bwOverrides, setBwOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs/${logId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ISelfWorkoutLog | null) => {
        if (cancelled) return;
        setLog(d);
        if (d) {
          setInputs(d.sets.map(() => ({ weight: '', reps: '' })));
          const map: Record<string, boolean> = {};
          d.sets.forEach((s) => {
            map[s.exerciseId.toString()] = s.isBodyweight;
          });
          setBwOverrides(map);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logId]);

  function syncLog(next: ISelfWorkoutLog) {
    setLog(next);
    setInputs((prev) => {
      if (next.sets.length <= prev.length) return prev;
      const extra = next.sets.length - prev.length;
      return [...prev, ...Array.from({ length: extra }, () => ({ weight: '', reps: '' }))];
    });
  }

  function updateInput(globalIndex: number, field: 'weight' | 'reps', value: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[globalIndex] = { ...next[globalIndex], [field]: value };
      return next;
    });
  }

  async function logSet(globalIndex: number) {
    if (!log) return;
    const set = log.sets[globalIndex];
    const exId = set.exerciseId.toString();
    const isBw = bwOverrides[exId] ?? set.isBodyweight;
    const i = inputs[globalIndex] ?? { weight: '', reps: '' };
    const weight = isBw
      ? null
      : i.weight === ''
        ? null
        : parseFloat(i.weight);
    const reps = i.reps === '' ? null : parseInt(i.reps, 10);
    const res = await fetch(`/api/me/workout-logs/${logId}/sets/${globalIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualWeight: weight, actualReps: reps }),
    });
    if (res.ok) syncLog((await res.json()) as ISelfWorkoutLog);
  }

  async function addSet(exerciseId: string) {
    if (!log) return;
    const exerciseSets = log.sets.filter((s) => s.exerciseId.toString() === exerciseId);
    const last = exerciseSets[exerciseSets.length - 1];
    if (!last) return;
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
    if (res.ok) syncLog((await res.json()) as ISelfWorkoutLog);
  }

  const groups = useMemo(() => (log ? buildGroups(log) : []), [log]);

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

      <div className="space-y-3">
        {groups.map((group, gi) => {
          if (group.type === 'standalone') {
            return (
              <div
                key={`${group.exerciseId}-${gi}`}
                className="rounded-xl bg-card ring-1 ring-foreground/10"
              >
                <ExerciseRow
                  mode="logging"
                  row={group.exercise}
                  label={(group.exercise as ExerciseRowData & { label?: string }).label ?? ''}
                  loggingSets={toLoggingSets(group.sets)}
                  inputs={inputs}
                  bwOverride={bwOverrides[group.exerciseId]}
                  onInputChange={updateInput}
                  onLogSet={(idx) => void logSet(idx)}
                  onAddSet={() => void addSet(group.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [group.exerciseId]: next }))
                  }
                />
              </div>
            );
          }
          return (
            <SupersetBlock
              key={group.groupId}
              mode="logging"
              groupId={group.groupId}
              loggingMembers={group.exercises.map((m) => ({
                row: m.exercise,
                label: (m.exercise as ExerciseRowData & { label?: string }).label ?? '',
                loggingSets: toLoggingSets(m.sets),
                inputs,
                bwOverride: bwOverrides[m.exerciseId],
              }))}
              onInputChange={(_, idx, field, value) => updateInput(idx, field, value)}
              onLogSet={(_, idx) => void logSet(idx)}
              onAddSet={(exId) => void addSet(exId)}
              onBwToggle={(exId, next) =>
                setBwOverrides((prev) => ({ ...prev, [exId]: next }))
              }
            />
          );
        })}
      </div>

      {log.sourceTemplateId === null && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => alert('Add Exercise picker coming later')}
        >
          + Add Exercise
        </Button>
      )}

      <CompleteWorkoutDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        logId={logId}
        onCompleted={() => router.push(basePath)}
      />
    </div>
  );
}
