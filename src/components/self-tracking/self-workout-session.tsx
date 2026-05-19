'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ExerciseRow,
  type ExerciseRowData,
  type LoggingSetInput,
} from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import {
  ExerciseSearchSheet,
  type ExerciseOption,
} from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import { useDirtyInputGuard } from '@/lib/training/dirty-input-guard';
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import { CompleteWorkoutDialog } from './complete-workout-dialog';

interface Props {
  logId: string;
  basePath: '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
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

function useElapsedTimer(startedAtIso: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAtIso) return;
    const start = new Date(startedAtIso).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso]);
  if (!startedAtIso) return '00:00';
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatStaticDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '0m';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}

export function SelfWorkoutSession({ logId, basePath }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<ISelfWorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inputs, setInputs] = useState<{ weight: string; reps: string }[]>([]);
  const [bwOverrides, setBwOverrides] = useState<Record<string, boolean>>({});
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());
  const [inputErrors, setInputErrors] = useState<Record<number, { weight?: boolean; reps?: boolean }>>({});
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [savingSets, setSavingSets] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs/${logId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ISelfWorkoutLog | null) => {
        if (cancelled) return;
        setLog(d);
        if (d) {
          setInputs(d.sets.map((s) => ({
            weight: s.actualWeight !== null ? String(s.actualWeight) : '',
            reps: s.actualReps !== null ? String(s.actualReps) : '',
          })));
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/exercises')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ExerciseOption[]) => {
        if (!cancelled) setAvailableExercises(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isFreestyle = log?.sourceTemplateId == null;
  const startedAtIso = log
    ? log.startedAt instanceof Date
      ? log.startedAt.toISOString()
      : (log.startedAt as unknown as string)
    : null;
  const elapsed = useElapsedTimer(startedAtIso);

  const completedAtIso = log?.completedAt
    ? log.completedAt instanceof Date
      ? log.completedAt.toISOString()
      : (log.completedAt as unknown as string)
    : null;
  const isCompleted = completedAtIso !== null;
  const staticDuration = formatStaticDuration(startedAtIso, completedAtIso);
  const completedDateLabel = completedAtIso
    ? new Date(completedAtIso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

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
    setInputErrors((prev) => {
      if (!prev[globalIndex]?.[field]) return prev;
      const next = { ...prev };
      next[globalIndex] = { ...next[globalIndex], [field]: undefined };
      if (!next[globalIndex].weight && !next[globalIndex].reps) delete next[globalIndex];
      return next;
    });
  }

  function deleteSet(globalIndex: number) {
    setDeletedIndices((prev) => new Set([...prev, globalIndex]));
    setInputs((prev) => {
      const next = [...prev];
      next[globalIndex] = { weight: '', reps: '' };
      return next;
    });
    setInputErrors((prev) => {
      const next = { ...prev };
      delete next[globalIndex];
      return next;
    });
  }

  function validateInputs(): Record<number, { weight?: boolean; reps?: boolean }> {
    if (!log) return {};
    const errors: Record<number, { weight?: boolean; reps?: boolean }> = {};
    log.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId.toString()] ?? set.isBodyweight;
      if (isBw) return;
      const weightFilled = input.weight.trim() !== '';
      const repsFilled = input.reps.trim() !== '';
      if (weightFilled && !repsFilled) errors[i] = { reps: true };
      else if (!weightFilled && repsFilled) errors[i] = { weight: true };
    });
    return errors;
  }

  async function handleFinishClick() {
    if (!log) return;
    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }
    // Only block if there are non-deleted sets and none have any data filled
    const nonDeletedCount = log.sets.filter((_, i) => !deletedIndices.has(i)).length;
    if (nonDeletedCount > 0) {
      const hasAnyData = log.sets.some((set, i) => {
        if (deletedIndices.has(i)) return false;
        const input = inputs[i] ?? { weight: '', reps: '' };
        const isBw = bwOverrides[set.exerciseId.toString()] ?? set.isBodyweight;
        return input.reps.trim() !== '' || (!isBw && input.weight.trim() !== '');
      });
      if (!hasAnyData) {
        toast.error('Fill in at least one set before completing.');
        return;
      }
    }
    setInputErrors({});

    // Batch-PATCH filled sets before opening the dialog
    const setsToSave: { index: number; weight: number | null; reps: number | null }[] = [];
    log.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId.toString()] ?? set.isBodyweight;
      const repsFilled = input.reps.trim() !== '';
      const weightFilled = !isBw && input.weight.trim() !== '';
      if (!repsFilled && !weightFilled) return;
      if (isBw && !repsFilled) return;
      setsToSave.push({
        index: i,
        weight: isBw ? null : parseFloat(input.weight) || null,
        reps: parseInt(input.reps, 10) || null,
      });
    });

    if (setsToSave.length > 0) {
      setSavingSets(true);
      try {
        const results = await Promise.all(
          setsToSave.map(({ index, weight, reps }) =>
            fetch(`/api/me/workout-logs/${logId}/sets/${index}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actualWeight: weight, actualReps: reps }),
            }),
          ),
        );
        for (const res of results) {
          if (!res.ok) {
            if (res.status === 404) {
              toast.error('This session was ended on another device.');
              router.push(basePath);
              return;
            }
            toast.error('Failed to save sets');
            return;
          }
        }
      } catch {
        toast.error('Something went wrong');
        return;
      } finally {
        setSavingSets(false);
      }
    }

    setCompleteOpen(true);
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
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
    if (res.ok) syncLog((await res.json()) as ISelfWorkoutLog);
  }

  async function addExercise(option: ExerciseOption) {
    if (!log) return;
    const newSet = {
      exerciseId: option._id,
      exerciseName: option.name,
      groupId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isSuperset: false,
      isBodyweight: option.isBodyweight,
      setNumber: 1,
      prescribedRepsMin: null,
      prescribedRepsMax: null,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await fetch(`/api/me/workout-logs/${logId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet),
    });
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
    if (!res.ok) {
      toast.error('Failed to add exercise');
      return;
    }
    const next = (await res.json()) as ISelfWorkoutLog;
    syncLog(next);
    setBwOverrides((prev) => ({ ...prev, [option._id]: option.isBodyweight }));
  }

  const groups = useMemo(() => (log ? buildGroups(log) : []), [log]);

  useDirtyInputGuard(inputs, log?.sets ?? []);

  function toLoggingSets(exSets: SetWithIndex[]): LoggingSetInput[] {
    return exSets
      .filter((s) => !deletedIndices.has(s.globalIndex))
      .map((s) => ({
        setNumber: s.setNumber,
        prescribedRepsMin: s.prescribedRepsMin ?? 0,
        prescribedRepsMax: s.prescribedRepsMax ?? 0,
        actualWeight: s.actualWeight,
        actualReps: s.actualReps,
        completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : (s.completedAt ?? null),
        globalIndex: s.globalIndex,
      }));
  }

  // Count sets that have at least reps filled (for the progress display)
  const filledSetCount = log
    ? log.sets.filter((_, i) => {
        if (deletedIndices.has(i)) return false;
        return (inputs[i]?.reps ?? '').trim() !== '';
      }).length
    : 0;
  const totalSetCount = log ? log.sets.length - deletedIndices.size : 0;

  if (loading) return <div className="p-6 text-foreground/65 text-sm">Loading…</div>;
  if (!log) return <div className="p-6 text-foreground/65 text-sm">Workout not found.</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        <div>
          <Link
            href={basePath}
            className="text-xs text-foreground/65 hover:text-foreground mb-1 block transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-base font-bold text-foreground">{log.dayName}</h1>
          {isFreestyle && (
            <div className="text-[10px] uppercase tracking-[1.6px] font-bold text-sky-300 mt-0.5">
              Freestyle
            </div>
          )}
        </div>
        <div className="text-sm font-mono font-semibold text-foreground/65 bg-muted rounded-md px-2 py-1">
          {isCompleted ? staticDuration : elapsed}
        </div>
      </div>

      <motion.div
        className="flex-1 px-4 sm:px-8 py-5 pb-32 max-w-2xl mx-auto w-full space-y-3"
        variants={variants.staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {groups.length === 0 && isFreestyle && (
          <p className="text-xs text-foreground/65 text-center pt-4">
            Pick exercises as you go. Log sets, then finish when you&apos;re done.
          </p>
        )}

        {groups.map((group, gi) => {
          if (group.type === 'standalone') {
            return (
              <motion.div
                key={`${group.exerciseId}-${gi}`}
                variants={variants.staggerItem}
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
                  onDeleteSet={deleteSet}
                  onAddSet={() => void addSet(group.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [group.exerciseId]: next }))
                  }
                  readOnly={isCompleted}
                  inputErrors={inputErrors}
                />
              </motion.div>
            );
          }
          return (
            <motion.div key={group.groupId} variants={variants.staggerItem}>
              <SupersetBlock
                mode="logging"
                groupId={group.groupId}
                loggingMembers={group.exercises.map((m) => ({
                  row: m.exercise,
                  label: (m.exercise as ExerciseRowData & { label?: string }).label ?? '',
                  loggingSets: toLoggingSets(m.sets),
                  inputs,
                  bwOverride: bwOverrides[m.exerciseId],
                  inputErrors,
                }))}
                onInputChange={(_, idx, field, value) => updateInput(idx, field, value)}
                onDeleteSet={(_, idx) => deleteSet(idx)}
                onAddSet={(exId) => void addSet(exId)}
                onBwToggle={(exId, next) =>
                  setBwOverrides((prev) => ({ ...prev, [exId]: next }))
                }
                readOnly={isCompleted}
              />
            </motion.div>
          );
        })}

        {isFreestyle && !isCompleted && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 py-4 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          >
            + Add Exercise
          </button>
        )}
      </motion.div>

      <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
          <span className="text-xs text-foreground/65 tabular-nums">
            {totalSetCount === 0
              ? 'No sets yet'
              : `${filledSetCount} / ${totalSetCount} sets filled`}
          </span>
          {isCompleted ? (
            <span className="text-xs text-foreground/65 tabular-nums">
              Completed {completedDateLabel} · {log.sets.length} sets · {staticDuration}
              {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
            </span>
          ) : (
            <Button onClick={() => void handleFinishClick()} disabled={savingSets}>
              {savingSets ? 'Saving…' : 'Finish'}
            </Button>
          )}
        </div>
      </div>

      <ExerciseSearchSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={availableExercises}
        onSelect={(ex) => void addExercise(ex)}
        onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
      />

      <CompleteWorkoutDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        logId={logId}
        onCompleted={() => router.push(basePath)}
      />
    </div>
  );
}
