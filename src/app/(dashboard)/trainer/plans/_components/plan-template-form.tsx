'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DayTabs } from '@/components/training/day-tabs';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import {
  ExerciseSearchSheet,
  type ExerciseOption,
} from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import type { IPlanDayExercise, IPlanDay } from '@/lib/db/models/plan-template.model';
import type mongoose from 'mongoose';

interface DayState {
  dayNumber: number;
  name: string;
  exercises: ExerciseRowData[];
}

interface FormPayload {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: { name: string; description: string | null; days: IPlanDay[] };
  exercises?: ExerciseOption[];
  onSubmit: (data: FormPayload) => Promise<void>;
  onCancel?: () => void;
}

type SheetTarget =
  | { kind: 'day'; dayIdx: number }
  | { kind: 'superset'; dayIdx: number; groupId: string }
  | null;

function rowToIPlanDayExercise(row: ExerciseRowData): IPlanDayExercise {
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

export function PlanTemplateForm({
  initialData,
  exercises: initialExercises = [],
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<DayState[]>(initialData?.days.map(toDayState) ?? []);
  const [activeDay, setActiveDay] = useState(0);
  const [pendingEmptyGroups, setPendingEmptyGroups] = useState<Map<number, string[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(initialExercises);
  const [degradeDialog, setDegradeDialog] = useState<{ count: number } | null>(null);
  const [errorRowIds, setErrorRowIds] = useState<Set<string>>(new Set());
  const [discardDialog, setDiscardDialog] = useState(false);

  const isEditMode = Boolean(initialData);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        days: initialData?.days ?? [],
      }),
    [initialData],
  );

  const isDirty = useMemo(() => {
    const current = JSON.stringify({
      name,
      description: description || null,
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        name: d.name,
        exercises: d.exercises.map((ex) => ({
          groupId: ex.groupId,
          isSuperset: ex.isSuperset,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          imageUrl: ex.imageUrl,
          isBodyweight: ex.isBodyweight,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          restSeconds: ex.restSeconds,
        })),
      })),
    });
    const initial = JSON.stringify({
      name: initialData?.name ?? '',
      description: initialData?.description ?? null,
      days: (initialData?.days ?? []).map((d) => ({
        dayNumber: d.dayNumber,
        name: d.name,
        exercises: d.exercises.map((ex) => ({
          groupId: ex.groupId,
          isSuperset: ex.isSuperset,
          exerciseId: ex.exerciseId.toString(),
          exerciseName: ex.exerciseName,
          imageUrl: ex.imageUrl,
          isBodyweight: ex.isBodyweight,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          restSeconds: ex.restSeconds,
        })),
      })),
    });
    return current !== initial;
  }, [name, description, days, initialData]);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Suppress unused-var lint since the snapshot is intentionally not referenced
  // (kept for future hash-based dirty checks).
  void initialSnapshot;

  function addDay() {
    const num = days.length + 1;
    setDays((prev) => [...prev, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
    setActiveDay(days.length);
  }

  function removeDay(dayIdx: number) {
    setDays((prev) =>
      prev.filter((_, i) => i !== dayIdx).map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      next.delete(dayIdx);
      return next;
    });
    setActiveDay((prev) => Math.min(prev, Math.max(0, days.length - 2)));
  }

  function updateDayName(dayIdx: number, value: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)));
  }

  function updateExerciseField(
    dayIdx: number,
    exerciseId: string,
    field: keyof ExerciseRowData,
    value: ExerciseRowData[keyof ExerciseRowData],
  ) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.exerciseId === exerciseId ? { ...ex, [field]: value } : ex,
          ),
        };
      }),
    );
  }

  function deleteExercise(dayIdx: number, exerciseId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, exercises: d.exercises.filter((ex) => ex.exerciseId !== exerciseId) };
      }),
    );
  }

  function moveStandalone(dayIdx: number, exerciseId: string, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const idx = exs.findIndex((ex) => ex.exerciseId === exerciseId);
        if (idx < 0 || exs[idx].isSuperset) return d;

        // find slice [idx, idx]; jump over the contiguous block (or single
        // standalone) on either side
        if (dir === 'up') {
          if (idx === 0) return d;
          const prevEnd = idx - 1;
          let prevStart = prevEnd;
          if (exs[prevEnd].isSuperset) {
            const gid = exs[prevEnd].groupId;
            while (
              prevStart > 0 &&
              exs[prevStart - 1].isSuperset &&
              exs[prevStart - 1].groupId === gid
            ) {
              prevStart--;
            }
          }
          const block = exs.slice(prevStart, prevEnd + 1);
          const moved = exs[idx];
          const next = [
            ...exs.slice(0, prevStart),
            moved,
            ...block,
            ...exs.slice(idx + 1),
          ];
          return { ...d, exercises: next };
        } else {
          if (idx === exs.length - 1) return d;
          const nextStart = idx + 1;
          let nextEnd = nextStart;
          if (exs[nextStart].isSuperset) {
            const gid = exs[nextStart].groupId;
            while (
              nextEnd < exs.length - 1 &&
              exs[nextEnd + 1].isSuperset &&
              exs[nextEnd + 1].groupId === gid
            ) {
              nextEnd++;
            }
          }
          const block = exs.slice(nextStart, nextEnd + 1);
          const moved = exs[idx];
          const next = [
            ...exs.slice(0, idx),
            ...block,
            moved,
            ...exs.slice(nextEnd + 1),
          ];
          return { ...d, exercises: next };
        }
      }),
    );
  }

  function moveSupersetMember(dayIdx: number, exerciseId: string, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const idx = exs.findIndex((ex) => ex.exerciseId === exerciseId);
        if (idx < 0 || !exs[idx].isSuperset) return d;
        const gid = exs[idx].groupId;
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= exs.length) return d;
        if (!exs[target].isSuperset || exs[target].groupId !== gid) return d;
        [exs[idx], exs[target]] = [exs[target], exs[idx]];
        return { ...d, exercises: exs };
      }),
    );
  }

  function addExerciseStandalone(dayIdx: number, exercise: ExerciseOption) {
    const newRow: ExerciseRowData = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      imageUrl: exercise.imageUrl,
      isBodyweight: exercise.isBodyweight,
      groupId: exercise._id,
      isSuperset: false,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
    };
    setDays((prev) =>
      prev.map((d, i) => (i === dayIdx ? { ...d, exercises: [...d.exercises, newRow] } : d)),
    );
  }

  function startEmptySuperset(dayIdx: number) {
    const groupId = crypto.randomUUID();
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = [...(next.get(dayIdx) ?? []), groupId];
      next.set(dayIdx, arr);
      return next;
    });
  }

  function addExerciseToSuperset(dayIdx: number, groupId: string, exercise: ExerciseOption) {
    const newRow: ExerciseRowData = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      imageUrl: exercise.imageUrl,
      isBodyweight: exercise.isBodyweight,
      groupId,
      isSuperset: true,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
    };
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const matches = exs
          .map((e, k) => (e.isSuperset && e.groupId === groupId ? k : -1))
          .filter((k) => k >= 0);
        const lastIdx = matches.length > 0 ? matches[matches.length - 1] : -1;
        if (lastIdx >= 0) {
          exs.splice(lastIdx + 1, 0, newRow);
        } else {
          exs.push(newRow);
        }
        return { ...d, exercises: exs };
      }),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function ungroupSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.isSuperset && ex.groupId === groupId
              ? { ...ex, isSuperset: false, groupId: ex.exerciseId }
              : ex,
          ),
        };
      }),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function deleteSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.filter((ex) => !(ex.isSuperset && ex.groupId === groupId)),
        };
      }),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function validate(daysToCheck: DayState[]): { firstError: string | null; rowIds: Set<string> } {
    const rowIds = new Set<string>();
    let firstError: string | null = null;
    if (!name.trim()) firstError = 'Plan name is required';
    if (daysToCheck.length === 0 && !firstError) firstError = 'Add at least one day';
    daysToCheck.forEach((d, idx) => {
      if (!d.name.trim() && !firstError) firstError = `Day ${idx + 1} needs a name`;
      if (d.exercises.length === 0 && !firstError) {
        firstError = `Day "${d.name || idx + 1}" needs at least one exercise`;
      }
      d.exercises.forEach((ex) => {
        const bad =
          !Number.isInteger(ex.sets) ||
          ex.sets < 1 ||
          !Number.isInteger(ex.repsMin) ||
          ex.repsMin < 1 ||
          !Number.isInteger(ex.repsMax) ||
          ex.repsMax < ex.repsMin ||
          (ex.restSeconds !== null &&
            (!Number.isInteger(ex.restSeconds) || ex.restSeconds < 0));
        if (bad) {
          rowIds.add(ex.exerciseId);
          if (!firstError) firstError = `Check sets/reps/rest on "${ex.exerciseName}"`;
        }
      });
    });
    return { firstError, rowIds };
  }

  function findSingleSupersetGroups(
    daysToCheck: DayState[],
  ): { dayIdx: number; groupId: string; row: ExerciseRowData }[] {
    const out: { dayIdx: number; groupId: string; row: ExerciseRowData }[] = [];
    daysToCheck.forEach((d, dayIdx) => {
      const counts = new Map<string, ExerciseRowData[]>();
      d.exercises
        .filter((e) => e.isSuperset)
        .forEach((e) => {
          counts.set(e.groupId, [...(counts.get(e.groupId) ?? []), e]);
        });
      counts.forEach((rows, groupId) => {
        if (rows.length === 1) out.push({ dayIdx, groupId, row: rows[0] });
      });
    });
    return out;
  }

  async function actuallySubmit(daysFinal: DayState[]) {
    setSaving(true);
    try {
      const payload: FormPayload = {
        name: name.trim(),
        description: description.trim() || null,
        days: daysFinal.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name.trim(),
          exercises: d.exercises.map(rowToIPlanDayExercise),
        })),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorRowIds(new Set());

    const v = validate(days);
    if (v.firstError) {
      setErrorRowIds(v.rowIds);
      toast.error(v.firstError);
      return;
    }

    const singles = findSingleSupersetGroups(days);
    if (singles.length > 0) {
      setDegradeDialog({ count: singles.length });
      return;
    }

    await actuallySubmit(days);
  }

  async function continueDegrade() {
    if (!degradeDialog) return;
    const singles = findSingleSupersetGroups(days);
    const singleIds = new Set(singles.map((s) => s.row.exerciseId));
    const daysFinal = days.map((d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        singleIds.has(ex.exerciseId)
          ? { ...ex, isSuperset: false, groupId: ex.exerciseId }
          : ex,
      ),
    }));
    setDegradeDialog(null);
    await actuallySubmit(daysFinal);
  }

  function handleCancel() {
    if (isDirty) {
      setDiscardDialog(true);
      return;
    }
    onCancel?.();
  }

  // ---------- render ----------

  function renderDay(day: DayState, dayIdx: number) {
    const labelled = labelExercises(day.exercises);
    const emptyGroupIds = pendingEmptyGroups.get(dayIdx) ?? [];

    type StandaloneSlot = {
      kind: 'standalone';
      exercise: (typeof labelled)[number];
    };
    type SupersetSlot = {
      kind: 'superset';
      groupId: string;
      members: { row: ExerciseRowData; label: string }[];
    };
    type EmptySlot = { kind: 'empty-superset'; groupId: string };
    type Slot = StandaloneSlot | SupersetSlot | EmptySlot;

    const slots: Slot[] = [];
    const seenGroups = new Set<string>();
    labelled.forEach((ex) => {
      if (!ex.isSuperset) {
        slots.push({ kind: 'standalone', exercise: ex });
      } else if (!seenGroups.has(ex.groupId)) {
        seenGroups.add(ex.groupId);
        const members = labelled
          .filter((e) => e.isSuperset && e.groupId === ex.groupId)
          .map((e) => ({ row: e as ExerciseRowData, label: e.label }));
        slots.push({ kind: 'superset', groupId: ex.groupId, members });
      }
    });
    emptyGroupIds.forEach((gid) => slots.push({ kind: 'empty-superset', groupId: gid }));

    // Build a flat list of standalone slot positions in `slots` for chevron states
    const standaloneSlotIdxs: number[] = [];
    slots.forEach((s, i) => {
      if (s.kind === 'standalone') standaloneSlotIdxs.push(i);
    });

    return (
      <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 space-y-3 border-0 shadow-none">
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Day ${dayIdx + 1}`}
            value={day.name}
            onChange={(e) => updateDayName(dayIdx, e.target.value)}
            className="flex-1 text-sm"
            aria-label={`Day ${dayIdx + 1} name`}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => removeDay(dayIdx)}
            className="text-foreground/65 hover:text-destructive hover:bg-muted text-xs shrink-0"
          >
            Remove Day
          </Button>
        </div>

        <div className="space-y-2">
          {slots.map((slot, slotPos) => {
            if (slot.kind === 'standalone') {
              const standaloneIdx = standaloneSlotIdxs.indexOf(slotPos);
              const onlyStandalone = standaloneSlotIdxs.length === 1;
              const position: 'first' | 'middle' | 'last' | 'only' = onlyStandalone
                ? 'only'
                : standaloneIdx === 0
                  ? 'first'
                  : standaloneIdx === standaloneSlotIdxs.length - 1
                    ? 'last'
                    : 'middle';
              return (
                <ExerciseRow
                  key={slot.exercise.exerciseId}
                  mode="edit"
                  row={slot.exercise as ExerciseRowData}
                  label={slot.exercise.label}
                  position={position}
                  onChange={(field, value) =>
                    updateExerciseField(dayIdx, slot.exercise.exerciseId, field, value)
                  }
                  onMoveUp={() => moveStandalone(dayIdx, slot.exercise.exerciseId, 'up')}
                  onMoveDown={() => moveStandalone(dayIdx, slot.exercise.exerciseId, 'down')}
                  onDelete={() => deleteExercise(dayIdx, slot.exercise.exerciseId)}
                  hasError={errorRowIds.has(slot.exercise.exerciseId)}
                />
              );
            }
            if (slot.kind === 'superset') {
              return (
                <SupersetBlock
                  key={slot.groupId}
                  mode="edit"
                  groupId={slot.groupId}
                  members={slot.members}
                  onChangeRow={(rowExId, field, value) =>
                    updateExerciseField(dayIdx, rowExId, field, value)
                  }
                  onMoveRow={(rowExId, dir) => moveSupersetMember(dayIdx, rowExId, dir)}
                  onDeleteRow={(rowExId) => deleteExercise(dayIdx, rowExId)}
                  onAddToSuperset={() =>
                    setSheetTarget({ kind: 'superset', dayIdx, groupId: slot.groupId })
                  }
                  onUngroup={() => ungroupSuperset(dayIdx, slot.groupId)}
                  onDeleteSuperset={() => deleteSuperset(dayIdx, slot.groupId)}
                  errorRowIds={errorRowIds}
                />
              );
            }
            return (
              <SupersetBlock
                key={slot.groupId}
                mode="edit"
                groupId={slot.groupId}
                members={[]}
                onChangeRow={() => {}}
                onMoveRow={() => {}}
                onDeleteRow={() => {}}
                onAddToSuperset={() =>
                  setSheetTarget({ kind: 'superset', dayIdx, groupId: slot.groupId })
                }
                onUngroup={() => ungroupSuperset(dayIdx, slot.groupId)}
                onDeleteSuperset={() => deleteSuperset(dayIdx, slot.groupId)}
              />
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setSheetTarget({ kind: 'day', dayIdx })}
            className="flex-1 rounded-lg border border-dashed border-foreground/15 py-2.5 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          >
            + Add Exercise
          </button>
          <button
            type="button"
            onClick={() => startEmptySuperset(dayIdx)}
            className="flex-1 rounded-lg border border-dashed border-foreground/15 py-2.5 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          >
            + Add Superset
          </button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 max-w-3xl mx-auto">
      <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-6 space-y-5 border-0 shadow-none">
        <div className="space-y-1.5">
          <label
            htmlFor="plan-name"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            Plan Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="plan-desc"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            Description
          </label>
          <Textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </Card>

      {days.length > 0 && (
        <DayTabs
          days={days.map((d) => ({ dayNumber: d.dayNumber, name: d.name }))}
          activeIndex={activeDay}
          onChange={setActiveDay}
          onAddDay={addDay}
        />
      )}

      {days.length === 0 ? (
        <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-8 text-center space-y-3 border-0 shadow-none">
          <p className="text-sm text-foreground/65">No training days yet.</p>
          <Button type="button" variant="outline" onClick={addDay}>
            + Add Day
          </Button>
        </Card>
      ) : (
        <Fragment>{days[activeDay] && renderDay(days[activeDay], activeDay)}</Fragment>
      )}

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-foreground/10 flex flex-col gap-2 z-10">
        <Button type="submit" className="w-full" disabled={saving || (isEditMode && !isDirty)}>
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="w-full"
          >
            Cancel
          </Button>
        )}
      </div>

      {sheetTarget !== null && (
        <ExerciseSearchSheet
          open
          onOpenChange={(open) => {
            if (!open) setSheetTarget(null);
          }}
          exercises={availableExercises}
          onSelect={(ex) => {
            if (sheetTarget.kind === 'day') addExerciseStandalone(sheetTarget.dayIdx, ex);
            else addExerciseToSuperset(sheetTarget.dayIdx, sheetTarget.groupId, ex);
            setSheetTarget(null);
          }}
          onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
        />
      )}

      <Dialog
        open={degradeDialog !== null}
        onOpenChange={(open) => !open && setDegradeDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Single-exercise supersets detected</DialogTitle>
            <DialogDescription>
              {degradeDialog?.count ?? 0} superset
              {(degradeDialog?.count ?? 0) === 1 ? '' : 's'} contain only one exercise. On save,
              they will be converted to standalone exercises. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDegradeDialog(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void continueDegrade()} disabled={saving}>
              {saving ? 'Saving…' : 'Continue & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardDialog} onOpenChange={setDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved edits. Leaving will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscardDialog(false);
                onCancel?.();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
