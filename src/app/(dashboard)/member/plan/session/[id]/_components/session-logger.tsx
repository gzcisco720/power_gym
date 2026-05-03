'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SetChip } from '@/components/shared/set-chip';
import { cn } from '@/lib/utils';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

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

export function SessionLogger({ session: initialSession, backPath = '/member/plan' }: { session: Session; backPath?: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();
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
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualWeight: set.isBodyweight ? null : parseFloat(input.weight) || null,
          actualReps: parseInt(input.reps, 10) || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to log set');
        return;
      }
      const updated = (await res.json()) as Session;
      setSession(updated);
      setActiveSetIndex(null);
      toast.success('Set logged');
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
      setSession(updated);
      setInputs((prev) => [...prev, { weight: '', reps: '' }]);
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
      toast.success('Session complete!');
      router.push(backPath);
    } catch {
      toast.error('Something went wrong');
      setCompleting(false);
    }
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

      <div className="px-4 sm:px-8 py-3">
        <ProgressBar
          value={completedCount}
          max={session.sets.length}
          label={`Session progress: ${completedCount} of ${session.sets.length} sets completed`}
        />
      </div>

      <div className="px-4 sm:px-8 py-4 space-y-4">
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
                  <span className="text-[11px] text-[#888] w-5">
                    {isExtraSet ? '+' : ''}
                  </span>
                  <span className="text-[11px] text-[#888] flex-1">
                    {repsLabel(prescribedRepsMin, prescribedRepsMax)}
                  </span>
                  {completedAt && (
                    <span className="text-[11px] text-[#888]">
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
                <div className="hidden sm:block mt-3 pt-3 border-t border-[#141414] space-y-2">
                  <div className="text-[10px] font-semibold text-[#777] uppercase tracking-widest">
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
                        className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#777]"
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
                      className="h-8 text-[12px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#777]"
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

      <Sheet
        open={isMobile && activeSetIndex !== null}
        onOpenChange={(open) => { if (!open) setActiveSetIndex(null); }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-[#0f0f0f] border-t border-[#1e1e1e] px-5 pb-8 pt-5 rounded-t-xl"
        >
          <SheetTitle className="sr-only">Log Set</SheetTitle>
          {activeSetIndex !== null && (() => {
            const set = session.sets[activeSetIndex];
            return (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#888]">
                    {set.exerciseName}
                  </div>
                  <div className="text-[15px] font-bold text-white mt-0.5">
                    Set {set.setNumber} — {repsLabel(set.prescribedRepsMin, set.prescribedRepsMax)}
                  </div>
                </div>
                <div className="flex gap-3">
                  {!set.isBodyweight && (
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#888]">
                        Weight (kg)
                      </label>
                      <Input
                        aria-label="Weight (kg)"
                        type="number"
                        value={inputs[activeSetIndex]?.weight ?? ''}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[activeSetIndex] = { ...next[activeSetIndex], weight: e.target.value };
                          setInputs(next);
                        }}
                        className="h-12 text-[16px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555]"
                        placeholder="e.g. 60"
                      />
                    </div>
                  )}
                  <div className={cn(!set.isBodyweight ? 'w-28' : 'flex-1', 'space-y-1.5')}>
                    <label className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#888]">
                      Reps
                    </label>
                    <Input
                      aria-label="Reps"
                      type="number"
                      value={inputs[activeSetIndex]?.reps ?? ''}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[activeSetIndex] = { ...next[activeSetIndex], reps: e.target.value };
                        setInputs(next);
                      }}
                      className="h-12 text-[16px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555]"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => logSet(activeSetIndex)}
                  className="w-full h-12 bg-white text-black hover:bg-white/90 text-[13px] font-bold"
                >
                  Log Set
                </Button>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
