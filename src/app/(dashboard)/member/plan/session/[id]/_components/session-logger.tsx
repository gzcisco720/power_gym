'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import { WorkoutCompleteModal } from '@/components/training/workout-complete-modal';
import { ExerciseNotePanel } from '@/components/training/exercise-note-panel';
import { labelExercises } from '@/lib/training/label-exercises';
import { useDirtyInputGuard } from '@/lib/training/dirty-input-guard';
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { LastWeightHintDTO } from '@/lib/training/progressive-overload';

interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  isExtraSet: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface Session {
  _id: string;
  memberId: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  sets: SessionSet[];
}

function formatStaticDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return '0m';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}

function useElapsedTimer(startedAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildExerciseGroups(sets: SessionSet[]) {
  const seen = new Set<string>();
  const uniqueExercises: ExerciseRowData[] = [];

  sets.forEach((s) => {
    if (seen.has(s.exerciseId)) return;
    seen.add(s.exerciseId);
    const exSets = sets.filter((x) => x.exerciseId === s.exerciseId);
    const maxSet = exSets.length > 0 ? Math.max(...exSets.map((x) => x.setNumber)) : 0;
    uniqueExercises.push({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      imageUrl: null,
      isBodyweight: s.isBodyweight,
      isSuperset: s.isSuperset,
      groupId: s.groupId,
      sets: maxSet,
      repsMin: s.prescribedRepsMin,
      repsMax: s.prescribedRepsMax,
      restSeconds: null,
    });
  });

  const labelled = labelExercises(uniqueExercises);
  type LabelledEx = (typeof labelled)[number];
  type StandaloneGroup = {
    type: 'standalone';
    exercise: LabelledEx;
    sets: (SessionSet & { globalIndex: number })[];
  };
  type SupersetGroup = {
    type: 'superset';
    groupId: string;
    exercises: { exercise: LabelledEx; sets: (SessionSet & { globalIndex: number })[] }[];
  };
  type Group = StandaloneGroup | SupersetGroup;

  const setsWithIndex = sets.map((s, i) => ({ ...s, globalIndex: i }));
  const groups: Group[] = [];
  const seenGroupIds = new Set<string>();

  for (const ex of labelled) {
    const exSets = setsWithIndex.filter((s) => s.exerciseId === ex.exerciseId);
    if (!ex.isSuperset) {
      groups.push({ type: 'standalone', exercise: ex, sets: exSets });
    } else if (!seenGroupIds.has(ex.groupId)) {
      seenGroupIds.add(ex.groupId);
      const groupExercises = labelled
        .filter((e) => e.groupId === ex.groupId && e.isSuperset)
        .map((e) => ({
          exercise: e,
          sets: setsWithIndex.filter((s) => s.exerciseId === e.exerciseId),
        }));
      groups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
    }
  }

  return groups;
}

export function SessionLogger({
  session: initialSession,
  backPath = '/member/plan',
  mode = 'member',
  loggedForMember,
}: {
  session: Session;
  backPath?: string;
  mode?: 'member' | 'trainer';
  loggedForMember?: { id: string; name: string };
}) {
  const { push } = useRouter();
  const elapsed = useElapsedTimer(initialSession.startedAt);
  const isCompleted = initialSession.completedAt !== null;
  const staticDuration = formatStaticDuration(initialSession.startedAt, initialSession.completedAt);
  const completedDateLabel = initialSession.completedAt
    ? new Date(initialSession.completedAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const [session, setSession] = useState(initialSession);
  const [inputs, setInputs] = useState<{ weight: string; reps: string }[]>(
    initialSession.sets.map((s) => ({
      weight: s.actualWeight !== null ? String(s.actualWeight) : '',
      reps: s.actualReps !== null ? String(s.actualReps) : '',
    })),
  );
  const [bwOverrides, setBwOverrides] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialSession.sets.forEach((s) => {
      map[s.exerciseId] = s.isBodyweight;
    });
    return map;
  });
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());
  const [inputErrors, setInputErrors] = useState<Record<number, { weight?: boolean; reps?: boolean }>>({});
  const [addingSetFor, setAddingSetFor] = useState<string | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [weightHints, setWeightHints] = useState<Map<string, LastWeightHintDTO>>(new Map());
  const exercisesFetchedRef = useRef(false);
  const hintsFetchedRef = useRef(false);

  useEffect(() => {
    if (exercisesFetchedRef.current) return;
    fetch('/api/exercises')
      .then((r) => r.json())
      .then((data: ExerciseOption[]) => setAvailableExercises(data))
      .catch(() => {});
    exercisesFetchedRef.current = true;
  }, []);

  useEffect(() => {
    if (hintsFetchedRef.current || isCompleted) return;
    const nonBwIds = [
      ...new Set(initialSession.sets.filter((s) => !s.isBodyweight).map((s) => s.exerciseId)),
    ];
    if (nonBwIds.length === 0) return;
    hintsFetchedRef.current = true;
    fetch(
      `/api/members/${initialSession.memberId}/exercise-last-weights?exerciseIds=${nonBwIds.join(',')}`,
    )
      .then((r) => r.json())
      .then((data: { hints: LastWeightHintDTO[] }) => {
        const map = new Map<string, LastWeightHintDTO>();
        data.hints.forEach((h) => map.set(h.exerciseId, h));
        setWeightHints(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncInputsToSession(updatedSession: Session) {
    setSession(updatedSession);
    setInputs((prev) => {
      if (updatedSession.sets.length <= prev.length) return prev;
      const extra = updatedSession.sets.length - prev.length;
      return [...prev, ...Array.from({ length: extra }, () => ({ weight: '', reps: '' }))];
    });
  }

  function updateInput(index: number, field: 'weight' | 'reps', value: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    // Clear error for this field when user starts correcting it
    setInputErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const next = { ...prev };
      next[index] = { ...next[index], [field]: undefined };
      if (!next[index].weight && !next[index].reps) delete next[index];
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
    const errors: Record<number, { weight?: boolean; reps?: boolean }> = {};
    session.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId] ?? set.isBodyweight;
      if (isBw) return; // BW only needs reps; empty reps means skip, no error
      const weightFilled = input.weight.trim() !== '';
      const repsFilled = input.reps.trim() !== '';
      if (weightFilled && !repsFilled) errors[i] = { reps: true };
      else if (!weightFilled && repsFilled) errors[i] = { weight: true };
    });
    return errors;
  }

  function handleCompleteWorkoutClick() {
    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }
    // Only block if there are non-deleted sets and none have any data filled
    const nonDeletedCount = session.sets.filter((_, i) => !deletedIndices.has(i)).length;
    if (nonDeletedCount > 0) {
      const hasAnyData = session.sets.some((set, i) => {
        if (deletedIndices.has(i)) return false;
        const input = inputs[i] ?? { weight: '', reps: '' };
        const isBw = bwOverrides[set.exerciseId] ?? set.isBodyweight;
        return input.reps.trim() !== '' || (!isBw && input.weight.trim() !== '');
      });
      if (!hasAnyData) {
        toast.error('Fill in at least one set before completing.');
        return;
      }
    }
    setInputErrors({});
    setShowCompleteModal(true);
  }

  async function addSet(exerciseId: string) {
    setAddingSetFor(exerciseId);
    const exercise = session.sets.find((s) => s.exerciseId === exerciseId);
    if (!exercise) return;
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          prescribedRepsMin: exercise.prescribedRepsMin,
          prescribedRepsMax: exercise.prescribedRepsMax,
        }),
      });
      if (res.status === 404) {
        toast.error('This session was ended on another device.');
        push(backPath);
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add set');
        return;
      }
      const updated = (await res.json()) as Session;
      syncInputsToSession(updated);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAddingSetFor(null);
    }
  }

  async function addExercise(exercise: ExerciseOption) {
    setAddingExercise(true);
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise._id,
          exerciseName: exercise.name,
          prescribedRepsMin: 8,
          prescribedRepsMax: 12,
        }),
      });
      if (res.status === 404) {
        toast.error('This session was ended on another device.');
        push(backPath);
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add exercise');
        return;
      }
      const updated = (await res.json()) as Session;
      syncInputsToSession(updated);
      setBwOverrides((prev) => ({ ...prev, [exercise._id]: exercise.isBodyweight }));
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAddingExercise(false);
    }
  }

  async function completeSession(rpe: number | null, memberNote: string | null) {
    setCompleting(true);
    setShowCompleteModal(false);

    // Collect all sets that have data to save
    const setsToSave: { index: number; weight: number | null; reps: number | null }[] = [];
    session.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId] ?? set.isBodyweight;
      const repsFilled = input.reps.trim() !== '';
      const weightFilled = !isBw && input.weight.trim() !== '';
      if (!repsFilled && !weightFilled) return; // skip fully empty sets
      setsToSave.push({
        index: i,
        weight: isBw ? null : parseFloat(input.weight) || null,
        reps: parseInt(input.reps, 10) || null,
      });
    });

    try {
      const patchResults = await Promise.all(
        setsToSave.map(({ index, weight, reps }) =>
          fetch(`/api/sessions/${session._id}/sets/${index}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actualWeight: weight, actualReps: reps }),
          }),
        ),
      );

      for (const res of patchResults) {
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          toast.error(data.error ?? 'Failed to save sets');
          setCompleting(false);
          return;
        }
      }

      const res = await fetch(`/api/sessions/${session._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpe, memberNote }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to complete session');
        setCompleting(false);
        return;
      }
      toast.success('Workout complete!');
      push(backPath);
    } catch {
      toast.error('Something went wrong');
      setCompleting(false);
    }
  }

  const groups = buildExerciseGroups(session.sets);

  useDirtyInputGuard(inputs, session.sets);

  function toLoggingSets(exSets: (SessionSet & { globalIndex: number })[]) {
    return exSets
      .filter((s) => !deletedIndices.has(s.globalIndex))
      .map((s) => ({
        setNumber: s.setNumber,
        prescribedRepsMin: s.prescribedRepsMin,
        prescribedRepsMax: s.prescribedRepsMax,
        actualWeight: s.actualWeight,
        actualReps: s.actualReps,
        completedAt: s.completedAt,
        globalIndex: s.globalIndex,
      }));
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        <div>
          <button
            type="button"
            onClick={() => push(backPath)}
            className="text-xs text-foreground/65 hover:text-foreground mb-1 block transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <div className="text-base font-bold text-foreground">{session.dayName}</div>
          {mode === 'trainer' && loggedForMember && (
            <div className="text-[10px] text-emerald-400 mt-0.5">
              Logging for: {loggedForMember.name}
            </div>
          )}
        </div>
        <div className="text-sm font-mono font-semibold text-foreground/65 bg-muted rounded-md px-2 py-1">
          {isCompleted ? staticDuration : elapsed}
        </div>
      </div>

      <motion.div
        className="flex-1 px-4 sm:px-8 py-5 pb-32 space-y-3"
        variants={variants.staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {groups.map((group) => {
          if (group.type === 'standalone') {
            const ex = group.exercise;
            const exRow: ExerciseRowData = {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              imageUrl: ex.imageUrl,
              isBodyweight: ex.isBodyweight,
              groupId: ex.groupId,
              isSuperset: ex.isSuperset,
              sets: ex.sets,
              repsMin: ex.repsMin,
              repsMax: ex.repsMax,
              restSeconds: ex.restSeconds,
            };
            return (
              <motion.div key={ex.exerciseId} variants={variants.staggerItem} className="rounded-xl bg-card ring-1 ring-foreground/10">
                <ExerciseRow
                  mode="logging"
                  row={exRow}
                  label={ex.label}
                  loggingSets={toLoggingSets(group.sets)}
                  inputs={inputs}
                  bwOverride={bwOverrides[ex.exerciseId]}
                  onInputChange={updateInput}
                  onDeleteSet={deleteSet}
                  onAddSet={() => void addSet(ex.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [ex.exerciseId]: next }))
                  }
                  readOnly={isCompleted}
                  inputErrors={inputErrors}
                  isAddingSet={addingSetFor === ex.exerciseId}
                  lastWeightHint={weightHints.get(ex.exerciseId)}
                />
                {mode === 'trainer' && loggedForMember && (
                  <div className="px-3 pb-3">
                    <ExerciseNotePanel
                      memberId={loggedForMember.id}
                      exerciseId={ex.exerciseId}
                      exerciseName={ex.exerciseName}
                      sessionId={session._id}
                    />
                  </div>
                )}
              </motion.div>
            );
          }
          return (
            <motion.div key={group.groupId} variants={variants.staggerItem}>
              <SupersetBlock
                mode="logging"
                groupId={group.groupId}
                loggingMembers={group.exercises.map(({ exercise, sets: exSets }) => ({
                  row: {
                    exerciseId: exercise.exerciseId,
                    exerciseName: exercise.exerciseName,
                    imageUrl: exercise.imageUrl,
                    isBodyweight: exercise.isBodyweight,
                    groupId: exercise.groupId,
                    isSuperset: exercise.isSuperset,
                    sets: exercise.sets,
                    repsMin: exercise.repsMin,
                    repsMax: exercise.repsMax,
                    restSeconds: exercise.restSeconds,
                  },
                  label: exercise.label,
                  loggingSets: toLoggingSets(exSets),
                  inputs,
                  bwOverride: bwOverrides[exercise.exerciseId],
                  inputErrors,
                  isAddingSet: addingSetFor === exercise.exerciseId,
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

        {!isCompleted && (
          <button
            type="button"
            onClick={() => !addingExercise && setExerciseSheetOpen(true)}
            disabled={addingExercise}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 py-4 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="+ Add Exercise"
          >
            + Add Exercise
          </button>
        )}
      </motion.div>

      <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
        {isCompleted ? (
          <div className="text-xs text-foreground/65 text-center tabular-nums py-1">
            Completed {completedDateLabel} · {session.sets.length} sets · {staticDuration}
            {session.rpe != null ? ` · RPE ${session.rpe}` : ''}
          </div>
        ) : (
          <Button
            onClick={handleCompleteWorkoutClick}
            disabled={completing}
            className="w-full text-sm font-bold py-3 h-auto rounded-xl"
          >
            {completing ? 'Saving…' : 'Complete Workout'}
          </Button>
        )}
      </div>

      {showCompleteModal && (
        <WorkoutCompleteModal
          onConfirm={(rpe, note) => void completeSession(rpe, note)}
          onCancel={() => setShowCompleteModal(false)}
          isLoading={completing}
        />
      )}

      <ExerciseSearchSheet
        open={exerciseSheetOpen}
        onOpenChange={setExerciseSheetOpen}
        exercises={availableExercises}
        onSelect={addExercise}
        onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
      />
    </div>
  );
}
