'use client';

import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDayExercise, IPlanDay } from '@/lib/db/models/plan-template.model';
import type mongoose from 'mongoose';

interface ExerciseRow {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

interface DayState {
  dayNumber: number;
  name: string;
  exercises: ExerciseRow[];
}

interface FormData {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: { name: string; description: string | null; days: IPlanDay[] };
  exercises?: ExerciseOption[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
}

function rowToIPlanDayExercise(row: ExerciseRow): IPlanDayExercise {
  return {
    groupId: row.groupId,
    isSuperset: row.isSuperset,
    exerciseId: row.exerciseId as unknown as mongoose.Types.ObjectId,
    exerciseName: row.exerciseName,
    imageUrl: row.imageUrl,
    isBodyweight: row.isBodyweight,
    sets: row.sets,
    repsMin: row.repsMin,
    repsMax: row.repsMax,
    restSeconds: row.restSeconds,
  };
}

function toDayState(day: IPlanDay): DayState {
  return {
    dayNumber: day.dayNumber,
    name: day.name,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      exerciseId: ex.exerciseId.toString(),
    })),
  };
}

export function PlanTemplateForm({ initialData, exercises: initialExercises = [], onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<DayState[]>(initialData?.days.map(toDayState) ?? []);
  const [saving, setSaving] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [exerciseSheetDay, setExerciseSheetDay] = useState<number | null>(null);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(initialExercises);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        days: initialData?.days ?? [],
      }),
    [initialData],
  );
  const isDirty = useMemo(
    () => JSON.stringify({ name, description, days }) !== initialSnapshot,
    [name, description, days, initialSnapshot],
  );

  function addDay() {
    const num = days.length + 1;
    setDays([...days, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
  }

  function updateDayName(dayIdx: number, value: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)));
  }

  function removeDay(dayIdx: number) {
    setDays((prev) =>
      prev
        .filter((_, i) => i !== dayIdx)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
  }

  function addExerciseToDayFromSheet(dayIdx: number, exercise: ExerciseOption) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const newExercise: ExerciseRow = {
          groupId: exercise._id,
          isSuperset: false,
          exerciseId: exercise._id,
          exerciseName: exercise.name,
          imageUrl: exercise.imageUrl,
          isBodyweight: exercise.isBodyweight,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: null,
        };
        return { ...d, exercises: [...d.exercises, newExercise] };
      }),
    );
    setExerciseSheetDay(null);
  }

  function updateExerciseField(
    dayIdx: number,
    exIdx: number,
    field: keyof ExerciseRow,
    value: ExerciseRow[keyof ExerciseRow],
  ) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex, j) =>
          j === exIdx ? { ...ex, [field]: value } : ex,
        );
        return { ...d, exercises };
      }),
    );
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) };
      }),
    );
  }

  function moveExercise(dayIdx: number, exIdx: number, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const target = dir === 'up' ? exIdx - 1 : exIdx + 1;
        if (target < 0 || target >= exs.length) return d;
        [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
        return { ...d, exercises: exs };
      }),
    );
  }

  function toggleExerciseSelection(dayIdx: number, exIdx: number) {
    const key = `${dayIdx}-${exIdx}`;
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function groupAsSuperset(dayIdx: number) {
    const day = days[dayIdx];
    const selectedIndices = day.exercises
      .map((_, i) => i)
      .filter((i) => selectedExercises.has(`${dayIdx}-${i}`));
    if (selectedIndices.length < 2) return;

    const groupId = crypto.randomUUID();
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex, j) =>
          selectedIndices.includes(j) ? { ...ex, groupId, isSuperset: true } : ex,
        );
        return { ...d, exercises };
      }),
    );
    setSelectedExercises(new Set());
  }

  function ungroupSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex) =>
          ex.groupId === groupId && ex.isSuperset
            ? { ...ex, groupId: ex.exerciseId, isSuperset: false }
            : ex,
        );
        return { ...d, exercises };
      }),
    );
  }

  const selectedKeysForDay = (dayIdx: number) =>
    days[dayIdx].exercises
      .map((_, i) => i)
      .filter((i) => selectedExercises.has(`${dayIdx}-${i}`));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: FormData = {
        name,
        description: description || null,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map(rowToIPlanDayExercise),
        })),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-3xl mx-auto">
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="plan-name" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]">
            Plan Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="plan-desc" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]">
            Description
          </label>
          <Textarea
            id="plan-desc"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white resize-none"
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#666]">Training Days</span>
          <Button type="button" variant="ghost" onClick={addDay}
            className="border border-[#1a1a1a] text-[#888] hover:border-[#333] hover:text-[#aaa] text-xs">
            + Add Day
          </Button>
        </div>

        {days.map((day, dayIdx) => {
          const selectedInDay = selectedKeysForDay(dayIdx);
          const canGroup = selectedInDay.length >= 2;

          return (
            <Card key={dayIdx} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Day ${dayIdx + 1}`}
                  value={day.name}
                  onChange={(e) => updateDayName(dayIdx, e.target.value)}
                  className="flex-1 bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white text-[13px]"
                />
                <Button type="button" variant="ghost" onClick={() => removeDay(dayIdx)}
                  className="text-[#777] hover:text-red-400 hover:bg-[#141414] text-xs shrink-0">
                  Remove
                </Button>
              </div>

              {canGroup && (
                <Button type="button" variant="ghost" onClick={() => groupAsSuperset(dayIdx)}
                  className="text-[11px] border border-[#2a2a2a] text-[#777] hover:border-[#444] hover:text-white">
                  Group as Superset ({selectedInDay.length} selected)
                </Button>
              )}

              <div className="space-y-2">
                {day.exercises.map((ex, exIdx) => {
                  const isSupersetMember = ex.isSuperset;

                  const sameGroupBefore = isSupersetMember &&
                    day.exercises.slice(0, exIdx).some((e) => e.groupId === ex.groupId && e.isSuperset);
                  if (sameGroupBefore) return null;

                  const groupMembers = isSupersetMember
                    ? day.exercises
                        .map((e, i) => ({ e, i }))
                        .filter(({ e }) => e.groupId === ex.groupId && e.isSuperset)
                    : [{ e: ex, i: exIdx }];

                  return (
                    <div
                      key={exIdx}
                      className={`rounded-lg border ${isSupersetMember ? 'border-[#2a2a2a]' : 'border-[#1a1a1a]'} overflow-hidden`}
                    >
                      {isSupersetMember && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#111]">
                          <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
                          <button
                            type="button"
                            onClick={() => ungroupSuperset(dayIdx, ex.groupId)}
                            className="text-[10px] text-[#555] hover:text-[#888]"
                          >
                            Ungroup
                          </button>
                        </div>
                      )}

                      {groupMembers.map(({ e, i: mIdx }, memberPos) => (
                        <div key={mIdx}>
                          {memberPos > 0 && <div className="h-px bg-[#141414]" />}
                          <div className="p-3 bg-[#0a0a0a]">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedExercises.has(`${dayIdx}-${mIdx}`)}
                                onChange={() => toggleExerciseSelection(dayIdx, mIdx)}
                                className="accent-white shrink-0"
                              />
                              <ExerciseThumbnail imageUrl={e.imageUrl} name={e.exerciseName} size={28} />
                              <span className="flex-1 text-[12px] font-medium text-white truncate">{e.exerciseName}</span>
                              <button type="button" onClick={() => moveExercise(dayIdx, mIdx, 'up')}
                                disabled={mIdx === 0}
                                className="text-[#555] hover:text-[#888] disabled:opacity-20 transition-colors">
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => moveExercise(dayIdx, mIdx, 'down')}
                                disabled={mIdx === day.exercises.length - 1}
                                className="text-[#555] hover:text-[#888] disabled:opacity-20 transition-colors">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => removeExercise(dayIdx, mIdx)}
                                className="text-[#555] hover:text-red-400 transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: 'Sets', field: 'sets' as const, value: e.sets },
                                { label: 'Reps Min', field: 'repsMin' as const, value: e.repsMin },
                                { label: 'Reps Max', field: 'repsMax' as const, value: e.repsMax },
                                { label: 'Rest (s)', field: 'restSeconds' as const, value: e.restSeconds ?? '' },
                              ].map(({ label, field, value }) => (
                                <div key={field} className="flex flex-col">
                                  <label className="text-[8px] uppercase tracking-[1px] text-[#555] mb-0.5">{label}</label>
                                  <Input
                                    type="number"
                                    value={value}
                                    onChange={(ev) =>
                                      updateExerciseField(dayIdx, mIdx, field, ev.target.value === '' ? null : Number(ev.target.value))
                                    }
                                    className="h-7 w-16 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white px-2"
                                  />
                                </div>
                              ))}
                              <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-1.5 text-[10px] text-[#666] cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={e.isBodyweight}
                                    onChange={(ev) => updateExerciseField(dayIdx, mIdx, 'isBodyweight', ev.target.checked)}
                                    className="accent-white"
                                  />
                                  BW
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setExerciseSheetDay(dayIdx)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#1a1a1a] py-3 text-[11px] text-[#555] hover:border-[#333] hover:text-[#777] transition-colors"
              >
                + Add Exercise
              </button>
            </Card>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex flex-col gap-2 z-10">
        <Button type="submit" className="w-full" disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="w-full border-border/70 text-foreground/65 hover:bg-muted hover:text-foreground hover:border-border"
          >
            Cancel
          </Button>
        )}
      </div>

      {exerciseSheetDay !== null && (
        <ExerciseSearchSheet
          open={exerciseSheetDay !== null}
          onOpenChange={(open) => { if (!open) setExerciseSheetDay(null); }}
          exercises={availableExercises}
          onSelect={(ex) => addExerciseToDayFromSheet(exerciseSheetDay, ex)}
          onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
        />
      )}
    </form>
  );
}
