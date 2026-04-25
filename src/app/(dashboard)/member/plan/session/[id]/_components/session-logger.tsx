'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SetChip } from '@/components/shared/set-chip';

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
  completedAt: string | null;
  sets: SessionSet[];
}

interface SetInputState {
  weight: string;
  reps: string;
}

export function SessionLogger({ session: initialSession }: { session: Session }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [inputs, setInputs] = useState<SetInputState[]>(
    initialSession.sets.map(() => ({ weight: '', reps: '' })),
  );
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);

  const completedCount = session.sets.filter((s) => s.completedAt !== null).length;
  const allDone = completedCount === session.sets.length;

  function groupedExercises() {
    const seen = new Set<string>();
    const exerciseIds: string[] = [];
    session.sets.forEach((s) => {
      if (!seen.has(s.exerciseId)) {
        seen.add(s.exerciseId);
        exerciseIds.push(s.exerciseId);
      }
    });
    return exerciseIds.map((id) => ({
      exerciseId: id,
      exerciseName: session.sets.find((s) => s.exerciseId === id)!.exerciseName,
      isBodyweight: session.sets.find((s) => s.exerciseId === id)!.isBodyweight,
      sets: session.sets.map((s, i) => ({ ...s, index: i })).filter((s) => s.exerciseId === id),
    }));
  }

  async function logSet(setIndex: number) {
    const input = inputs[setIndex];
    const set = session.sets[setIndex];
    const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualWeight: set.isBodyweight ? null : parseFloat(input.weight) || null,
        actualReps: parseInt(input.reps, 10) || null,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Session;
      setSession(updated);
      setActiveSetIndex(null);
    }
  }

  async function addSet(exerciseId: string) {
    const exercise = session.sets.find((s) => s.exerciseId === exerciseId);
    if (!exercise) return;
    const res = await fetch(`/api/sessions/${session._id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        prescribedRepsMin: exercise.prescribedRepsMin,
        prescribedRepsMax: exercise.prescribedRepsMax,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Session;
      setSession(updated);
      setInputs((prev) => [...prev, { weight: '', reps: '' }]);
    }
  }

  async function completeSession() {
    setCompleting(true);
    const res = await fetch(`/api/sessions/${session._id}/complete`, { method: 'POST' });
    if (res.ok) router.push('/member/plan');
    else setCompleting(false);
  }

  function repsLabel(min: number, max: number) {
    return min === max ? `${min} reps` : `${min}–${max} reps`;
  }

  const completeButton = allDone ? (
    <Button
      size="sm"
      onClick={completeSession}
      disabled={completing}
      className="bg-white text-black hover:bg-white/90 text-[11px] font-semibold disabled:opacity-50"
    >
      {completing ? 'Saving…' : 'Complete Session'}
    </Button>
  ) : undefined;

  return (
    <div>
      <PageHeader
        title={session.dayName}
        subtitle={`${completedCount} / ${session.sets.length} sets done`}
        actions={completeButton}
      />

      <div className="px-8 py-3">
        <ProgressBar
          value={completedCount}
          max={session.sets.length}
          label={`Session progress: ${completedCount} of ${session.sets.length} sets completed`}
        />
      </div>

      <div className="px-8 py-4 space-y-4">
        {groupedExercises().map(({ exerciseId, exerciseName, isBodyweight, sets }) => (
          <Card key={exerciseId} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
            <SectionHeader
              title={exerciseName}
              action="+ Add set"
              onAction={() => addSet(exerciseId)}
            />

            <div className="mt-3 space-y-2">
              {sets.map(({ index, setNumber, prescribedRepsMin, prescribedRepsMax, completedAt, isExtraSet }) => (
                <div key={index} className="flex items-center gap-2.5">
                  <SetChip
                    setNumber={setNumber}
                    done={completedAt !== null}
                    onClick={() => {
                      if (completedAt === null) {
                        setActiveSetIndex(activeSetIndex === index ? null : index);
                      }
                    }}
                  />
                  <span className="text-[11px] text-[#444] w-5">
                    {isExtraSet ? '+' : ''}
                  </span>
                  <span className="text-[11px] text-[#555] flex-1">
                    {repsLabel(prescribedRepsMin, prescribedRepsMax)}
                  </span>
                  {completedAt && (
                    <span className="text-[11px] text-[#555]">
                      {session.sets[index].actualWeight
                        ? `${session.sets[index].actualWeight} kg × `
                        : ''}
                      {session.sets[index].actualReps} reps
                    </span>
                  )}
                </div>
              ))}
            </div>

            {sets.some(({ index }) => activeSetIndex === index) && (() => {
              const activeSet = sets.find(({ index }) => activeSetIndex === index)!;
              return (
                <div className="mt-3 pt-3 border-t border-[#141414] space-y-2">
                  <div className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
                    Log Set {activeSet.setNumber}
                  </div>
                  <div className="flex gap-2">
                    {!isBodyweight && (
                      <Input
                        aria-label="Weight (kg)"
                        placeholder="Weight (kg)"
                        type="number"
                        value={inputs[activeSet.index]?.weight ?? ''}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[activeSet.index] = { ...next[activeSet.index], weight: e.target.value };
                          setInputs(next);
                        }}
                        className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333]"
                      />
                    )}
                    <Input
                      aria-label="Reps"
                      placeholder="Reps"
                      type="number"
                      value={inputs[activeSet.index]?.reps ?? ''}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[activeSet.index] = { ...next[activeSet.index], reps: e.target.value };
                        setInputs(next);
                      }}
                      className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333]"
                    />
                    <Button
                      size="sm"
                      onClick={() => logSet(activeSet.index)}
                      className="h-8 bg-white text-black hover:bg-white/90 text-[11px] font-semibold shrink-0"
                    >
                      Log Set
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        ))}
      </div>
    </div>
  );
}
