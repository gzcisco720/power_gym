// src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import { cn } from '@/lib/utils';

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
  sets: SessionSet[];
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
  const uniqueExercises: {
    exerciseId: string;
    exerciseName: string;
    imageUrl: null;
    isBodyweight: boolean;
    isSuperset: boolean;
    groupId: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    restSeconds: null;
  }[] = [];

  sets.forEach((s) => {
    if (!seen.has(s.exerciseId)) {
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
    }
  });

  const labelled = labelExercises(uniqueExercises);

  type LabelledEx = (typeof labelled)[number];
  type StandaloneGroup = { type: 'standalone'; exercise: LabelledEx; sets: (SessionSet & { globalIndex: number })[] };
  type SupersetGroup = { type: 'superset'; groupId: string; exercises: { exercise: LabelledEx; sets: (SessionSet & { globalIndex: number })[] }[] };
  type Group = StandaloneGroup | SupersetGroup;

  const groups: Group[] = [];
  const seenGroupIds = new Set<string>();
  const setsWithIndex = sets.map((s, i) => ({ ...s, globalIndex: i }));

  for (const ex of labelled) {
    const exSets = setsWithIndex.filter((s) => s.exerciseId === ex.exerciseId);
    if (!ex.isSuperset) {
      groups.push({ type: 'standalone', exercise: ex, sets: exSets });
    } else {
      if (!seenGroupIds.has(ex.groupId)) {
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
  }

  return groups;
}

export function SessionLogger({
  session: initialSession,
  backPath = '/member/plan',
}: {
  session: Session;
  backPath?: string;
}) {
  const router = useRouter();
  const elapsed = useElapsedTimer(initialSession.startedAt);
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
  const [completing, setCompleting] = useState(false);
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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to log set');
        return;
      }
      const updated = (await res.json()) as Session;
      syncInputsToSession(updated);
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function addSet(exerciseId: string) {
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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add set');
        return;
      }
      const updated = (await res.json()) as Session;
      syncInputsToSession(updated);
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function addExercise(exercise: ExerciseOption) {
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
    }
  }

  async function completeSession() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/sessions/${session._id}/complete`, { method: 'POST' });
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

  function renderExerciseCard(
    exercise: {
      exerciseId: string;
      exerciseName: string;
      isBodyweight: boolean;
      label: string;
      imageUrl: string | null;
      isSuperset: boolean;
      groupId: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number | null;
    },
    exSets: (SessionSet & { globalIndex: number })[],
  ) {
    const isBodyweight = bwOverrides[exercise.exerciseId] ?? exercise.isBodyweight;
    const firstSet = exSets[0];
    const repsLabel = firstSet
      ? firstSet.prescribedRepsMin === firstSet.prescribedRepsMax
        ? `${firstSet.prescribedRepsMin} reps`
        : `${firstSet.prescribedRepsMin}–${firstSet.prescribedRepsMax} reps`
      : '';

    return (
      <div key={exercise.exerciseId}>
        {/* Exercise header row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <ExerciseThumbnail imageUrl={exercise.imageUrl} name={exercise.exerciseName} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ExerciseBadge label={exercise.label} />
              <span className="text-[13px] font-semibold text-white truncate">{exercise.exerciseName}</span>
            </div>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[9px] text-[#555] bg-[#141414] rounded px-1.5 py-0.5">
                Sets: {exSets.length > 0 ? Math.max(...exSets.map((s) => s.setNumber)) : 0}
              </span>
              <span className="text-[9px] text-[#555] bg-[#141414] rounded px-1.5 py-0.5">{repsLabel}</span>
            </div>
          </div>
          {/* BW toggle */}
          <label className="flex items-center gap-1.5 text-[10px] text-[#666] cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) =>
                setBwOverrides((prev) => ({ ...prev, [exercise.exerciseId]: e.target.checked }))
              }
              className="accent-white"
            />
            BW
          </label>
        </div>

        {/* Set rows */}
        <div className="space-y-1.5">
          {exSets.map(({ globalIndex, setNumber, completedAt, actualWeight, actualReps }) => {
            const done = completedAt !== null;
            return (
              <div key={globalIndex} className={cn('flex items-center gap-2', done && 'opacity-60')}>
                <span className="text-[11px] text-[#555] w-5 shrink-0 font-mono">
                  {String(setNumber).padStart(2, '0')}
                </span>
                {done ? (
                  <>
                    <span className="flex-1 text-[11px] text-[#666]">
                      {!isBodyweight && actualWeight !== null ? `${actualWeight} kg × ` : ''}
                      {actualReps !== null ? `${actualReps} reps` : '–'}
                    </span>
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-white/10">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    {!isBodyweight ? (
                      <Input
                        aria-label={`Set ${setNumber} weight`}
                        type="number"
                        placeholder="kg"
                        value={inputs[globalIndex]?.weight ?? ''}
                        onChange={(e) => updateInput(globalIndex, 'weight', e.target.value)}
                        className="h-7 w-16 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#444] px-2"
                      />
                    ) : (
                      <div className="h-7 w-16 shrink-0 flex items-center justify-center rounded-md border border-[#1e1e1e] text-[10px] text-[#333]">
                        BW
                      </div>
                    )}
                    <Input
                      aria-label={`Set ${setNumber} reps`}
                      type="number"
                      placeholder="reps"
                      value={inputs[globalIndex]?.reps ?? ''}
                      onChange={(e) => updateInput(globalIndex, 'reps', e.target.value)}
                      className="h-7 flex-1 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#444] px-2"
                    />
                    <button
                      onClick={() => logSet(globalIndex)}
                      className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-[#555] hover:border-white hover:text-white transition-colors"
                      aria-label={`Complete set ${setNumber}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* + Add Set */}
        <button
          onClick={() => addSet(exercise.exerciseId)}
          className="mt-2 text-[11px] text-[#555] hover:text-[#888] transition-colors"
        >
          + Add Set
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-[#0f0f0f]">
        <div>
          <button
            onClick={() => router.push(backPath)}
            className="text-[11px] text-[#555] hover:text-[#888] mb-1 block transition-colors"
          >
            ← Back
          </button>
          <div className="text-[16px] font-bold text-white">{session.dayName}</div>
        </div>
        <div className="text-[18px] font-mono font-semibold text-[#666]">{elapsed}</div>
      </div>

      {/* Exercise cards */}
      <div className="flex-1 px-4 sm:px-8 py-5 pb-32 space-y-4">
        {groups.map((group) => {
          if (group.type === 'standalone') {
            return (
              <div key={group.exercise.exerciseId} className="rounded-xl bg-[#0c0c0c] border border-[#141414] p-4">
                {renderExerciseCard(group.exercise, group.sets)}
              </div>
            );
          }
          // Superset block
          return (
            <div key={group.groupId} className="rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="flex justify-center py-1.5 bg-[#111]">
                <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
              </div>
              {group.exercises.map(({ exercise, sets: exSets }, j) => (
                <div key={exercise.exerciseId}>
                  {j > 0 && <div className="h-px bg-[#141414]" />}
                  <div className="bg-[#0c0c0c] p-4">
                    {renderExerciseCard(exercise, exSets)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* + Add Exercise */}
        <button
          onClick={() => setExerciseSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#1e1e1e] py-4 text-[12px] text-[#555] hover:border-[#333] hover:text-[#777] transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      {/* Sticky Complete Workout button */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
        <Button
          onClick={completeSession}
          disabled={completing}
          className="w-full bg-white text-black hover:bg-white/90 text-[13px] font-bold py-3 h-auto rounded-xl disabled:opacity-50"
        >
          {completing ? 'Saving…' : 'Complete Workout'}
        </Button>
      </div>

      {/* Exercise search sheet */}
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
