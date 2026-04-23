'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [completing, setCompleting] = useState(false);

  const allDone = session.sets.every((s) => s.completedAt !== null);

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
    if (res.ok) router.push('/dashboard/member/plan');
    else setCompleting(false);
  }

  function repsLabel(min: number, max: number) {
    return min === max ? `${min} 次` : `${min}-${max} 次`;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{session.dayName}</h1>

      {groupedExercises().map(({ exerciseId, exerciseName, isBodyweight, sets }) => (
        <div key={exerciseId} className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">{exerciseName}</h2>
          {sets.map(({ index, setNumber, prescribedRepsMin, prescribedRepsMax, completedAt, isExtraSet }) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-12">组 {setNumber}{isExtraSet ? ' +' : ''}</span>
              <span className="text-sm text-muted-foreground w-16">{repsLabel(prescribedRepsMin, prescribedRepsMax)}</span>
              {completedAt ? (
                <span className="text-sm text-green-600">✓ {session.sets[index].actualWeight ? `${session.sets[index].actualWeight}kg × ` : ''}{session.sets[index].actualReps}次</span>
              ) : (
                <>
                  {!isBodyweight && (
                    <input
                      placeholder="重量"
                      value={inputs[index]?.weight ?? ''}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[index] = { ...next[index], weight: e.target.value };
                        setInputs(next);
                      }}
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                  )}
                  <input
                    placeholder="次数"
                    value={inputs[index]?.reps ?? ''}
                    onChange={(e) => {
                      const next = [...inputs];
                      next[index] = { ...next[index], reps: e.target.value };
                      setInputs(next);
                    }}
                    className="w-20 rounded border px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => logSet(index)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    记录
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => addSet(exerciseId)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + 加组
          </button>
        </div>
      ))}

      {allDone && (
        <button
          onClick={completeSession}
          disabled={completing}
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {completing ? '提交中...' : '完成训练'}
        </button>
      )}
    </div>
  );
}
