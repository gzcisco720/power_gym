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
  const router = useRouter();
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
    initialSession.sets.map(() => ({ weight: '', reps: '' })),
  );
  const [bwOverrides, setBwOverrides] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialSession.sets.forEach((s) => {
      map[s.exerciseId] = s.isBodyweight;
    });
    return map;
  });
  const [loggingSetIndex, setLoggingSetIndex] = useState<number | null>(null);
  const [addingSetFor, setAddingSetFor] = useState<string | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const exercisesFetchedRef = useRef(false);

  useEffect(() => {
    if (exercisesFetchedRef.current) return;
    fetch('/api/exercises')
      .then((r) => r.json())
      .then((data: ExerciseOption[]) => setAvailableExercises(data))
      .catch(() => {});
    exercisesFetchedRef.current = true;
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
  }

  async function logSet(setIndex: number) {
    setLoggingSetIndex(setIndex);
    const input = inputs[setIndex];
    const set = session.sets[setIndex];
    const isBodyweight = bwOverrides[set.exerciseId] ?? set.isBodyweight;
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualWeight: isBodyweight ? null : parseFloat(input.weight) || null,
          actualReps: parseInt(input.reps, 10) || null,
        }),
      });
      if (res.status === 404) {
        toast.error('This session was ended on another device.');
        router.push(backPath);
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to log set');
        return;
      }
      const updated = (await res.json()) as Session;
      syncInputsToSession(updated);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoggingSetIndex(null);
    }
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
        router.push(backPath);
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
        router.push(backPath);
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
    try {
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
      router.push(backPath);
    } catch {
      toast.error('Something went wrong');
      setCompleting(false);
    }
  }

  const groups = buildExerciseGroups(session.sets);

  useDirtyInputGuard(inputs, session.sets);

  function toLoggingSets(exSets: (SessionSet & { globalIndex: number })[]) {
    return exSets.map((s) => ({
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
      <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        <div>
          <button
            onClick={() => router.push(backPath)}
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
                  onLogSet={(idx) => void logSet(idx)}
                  onAddSet={() => void addSet(ex.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [ex.exerciseId]: next }))
                  }
                  readOnly={isCompleted}
                  pendingSetIndex={loggingSetIndex}
                  isAddingSet={addingSetFor === ex.exerciseId}
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
                  pendingSetIndex: loggingSetIndex,
                  isAddingSet: addingSetFor === exercise.exerciseId,
                }))}
                onInputChange={(_, idx, field, value) => updateInput(idx, field, value)}
                onLogSet={(_, idx) => void logSet(idx)}
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
            onClick={() => !addingExercise && setExerciseSheetOpen(true)}
            disabled={addingExercise}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 py-4 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="+ Add Exercise"
          >
            + Add Exercise
          </button>
        )}
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-foreground/10 bg-background px-4 sm:px-8 py-3">
        {isCompleted ? (
          <div className="text-xs text-foreground/65 text-center tabular-nums py-1">
            Completed {completedDateLabel} · {session.sets.length} sets · {staticDuration}
            {session.rpe != null ? ` · RPE ${session.rpe}` : ''}
          </div>
        ) : (
          <Button
            onClick={() => setShowCompleteModal(true)}
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
