import { useEffect, useReducer, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { m } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExerciseRow, type ExerciseRowData, type LoggingSetInput } from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import { CompleteWorkoutDialog } from '@/components/self-tracking/complete-workout-dialog';
import { variants } from '@/lib/animations/variants';
import { request } from '@/api/client';
import type { SelfWorkoutLog, SelfWorkoutSet } from '@/api/self-training';

type BasePath = '/owner/my-training' | '/trainer/my-training' | '/member/my-training';

interface SetWithIndex extends SelfWorkoutSet {
  globalIndex: number;
}

type Group =
  | { type: 'standalone'; exerciseId: string; exercise: ExerciseRowData; sets: SetWithIndex[] }
  | {
      type: 'superset';
      groupId: string;
      exercises: { exerciseId: string; exercise: ExerciseRowData; sets: SetWithIndex[] }[];
    };

function buildGroups(log: SelfWorkoutLog): Group[] {
  const setsWithIndex: SetWithIndex[] = log.sets.map((s, i) => ({ ...s, globalIndex: i }));

  const seenExerciseIds = new Set<string>();
  const exerciseRows: ExerciseRowData[] = [];
  for (const s of setsWithIndex) {
    const exId = s.exerciseId;
    if (seenExerciseIds.has(exId)) continue;
    seenExerciseIds.add(exId);
    const exSets = setsWithIndex.filter((x) => x.exerciseId === exId);
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
    const exSets = setsWithIndex.filter((s) => s.exerciseId === ex.exerciseId);
    const exRow: ExerciseRowData = ex;
    if (!ex.isSuperset) {
      groups.push({ type: 'standalone', exerciseId: ex.exerciseId, exercise: exRow, sets: exSets });
    } else if (!seenGroupIds.has(ex.groupId)) {
      seenGroupIds.add(ex.groupId);
      const groupExercises = labelled.flatMap((e) =>
        e.isSuperset && e.groupId === ex.groupId
          ? [{ exerciseId: e.exerciseId, exercise: e as ExerciseRowData, sets: setsWithIndex.filter((s) => s.exerciseId === e.exerciseId) }]
          : [],
      );
      groups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
    }
  }
  return groups;
}

function formatStaticDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '0m';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}

/**
 * TIMER FIX: RestTimer receives a stable `startedAtIso` string (set once at session
 * load, never updated on set-log). It holds its own elapsed state in a useReducer
 * that fires on setInterval — completely decoupled from parent component state.
 * Even when the parent SelfSessionPage re-renders (due to set logging, input changes),
 * this component does NOT re-mount because it receives the same prop value.
 */
function RestTimer({ startedAtIso }: { startedAtIso: string }) {
  const startedAtMs = useRef(new Date(startedAtIso).getTime()).current;
  const [elapsed, tick] = useReducer(
    () => Math.floor((Date.now() - startedAtMs) / 1000),
    Math.floor((Date.now() - startedAtMs) / 1000),
  );

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // Empty dep array: this effect never restarts — that is intentional and is the v1 bug fix.
  }, []); // oxlint-disable-line react-doctor/no-array-index-key

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <span
      data-testid="session-timer"
      className="text-sm font-mono font-semibold text-foreground/65 bg-muted rounded-md px-2 py-1"
    >
      {mm}:{ss}
    </span>
  );
}

interface SessionState {
  log: SelfWorkoutLog | null;
  loading: boolean;
  completeOpen: boolean;
  pickerOpen: boolean;
  inputs: { weight: string; reps: string }[];
  bwOverrides: Record<string, boolean>;
  deletedIndices: Set<number>;
  inputErrors: Record<number, { weight?: boolean; reps?: boolean }>;
  availableExercises: ExerciseOption[];
  savingSets: boolean;
}

type SessionAction =
  | { type: 'SET_LOG'; value: SelfWorkoutLog | null }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_COMPLETE_OPEN'; value: boolean }
  | { type: 'SET_PICKER_OPEN'; value: boolean }
  | { type: 'SET_INPUTS'; value: { weight: string; reps: string }[] }
  | { type: 'SET_BW_OVERRIDES'; value: Record<string, boolean> }
  | { type: 'SET_DELETED_INDICES'; value: Set<number> }
  | { type: 'SET_INPUT_ERRORS'; value: Record<number, { weight?: boolean; reps?: boolean }> }
  | { type: 'SET_AVAILABLE_EXERCISES'; value: ExerciseOption[] }
  | { type: 'SET_SAVING_SETS'; value: boolean };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_LOG': return { ...state, log: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_COMPLETE_OPEN': return { ...state, completeOpen: action.value };
    case 'SET_PICKER_OPEN': return { ...state, pickerOpen: action.value };
    case 'SET_INPUTS': return { ...state, inputs: action.value };
    case 'SET_BW_OVERRIDES': return { ...state, bwOverrides: action.value };
    case 'SET_DELETED_INDICES': return { ...state, deletedIndices: action.value };
    case 'SET_INPUT_ERRORS': return { ...state, inputErrors: action.value };
    case 'SET_AVAILABLE_EXERCISES': return { ...state, availableExercises: action.value };
    case 'SET_SAVING_SETS': return { ...state, savingSets: action.value };
    default: return state;
  }
}

interface Props {
  basePath?: BasePath;
}

export function SelfSessionPage({ basePath = '/owner/my-training' }: Props) {
  const { id: logId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(sessionReducer, {
    log: null, loading: true, completeOpen: false, pickerOpen: false,
    inputs: [], bwOverrides: {}, deletedIndices: new Set<number>(), inputErrors: {},
    availableExercises: [], savingSets: false,
  });
  const { log, loading, completeOpen, pickerOpen, inputs, bwOverrides, deletedIndices, inputErrors, availableExercises, savingSets } = state;

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    request<SelfWorkoutLog>(`/api/me/workout-logs/${logId}`)
      .then((d) => {
        if (cancelled) return;
        dispatch({ type: 'SET_LOG', value: d });
        if (d) {
          dispatch({ type: 'SET_INPUTS', value: d.sets.map((s) => ({
            weight: s.actualWeight !== null ? String(s.actualWeight) : '',
            reps: s.actualReps !== null ? String(s.actualReps) : '',
          })) });
          const map: Record<string, boolean> = {};
          d.sets.forEach((s) => { map[s.exerciseId] = s.isBodyweight; });
          dispatch({ type: 'SET_BW_OVERRIDES', value: map });
        }
        dispatch({ type: 'SET_LOADING', value: false });
      })
      .catch(() => { if (!cancelled) dispatch({ type: 'SET_LOADING', value: false }); });
    return () => { cancelled = true; };
  }, [logId]);

  useEffect(() => {
    let cancelled = false;
    request<ExerciseOption[]>('/api/exercises')
      .then((data) => { if (!cancelled) dispatch({ type: 'SET_AVAILABLE_EXERCISES', value: data }); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  const isFreestyle = log?.sourceTemplateId == null;
  const startedAtIso = log?.startedAt ?? null;
  const completedAtIso = log?.completedAt ?? null;
  const isCompleted = completedAtIso !== null;
  const staticDuration = formatStaticDuration(startedAtIso, completedAtIso);
  const completedDateLabel = completedAtIso
    ? new Date(completedAtIso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  function syncLog(next: SelfWorkoutLog) {
    dispatch({ type: 'SET_LOG', value: next });
    if (next.sets.length > inputs.length) {
      const extra = next.sets.length - inputs.length;
      dispatch({ type: 'SET_INPUTS', value: [...inputs, ...Array.from({ length: extra }, () => ({ weight: '', reps: '' }))] });
    }
  }

  function updateInput(globalIndex: number, field: 'weight' | 'reps', value: string) {
    const nextInputs = [...inputs];
    nextInputs[globalIndex] = { ...nextInputs[globalIndex], [field]: value };
    dispatch({ type: 'SET_INPUTS', value: nextInputs });
    if (inputErrors[globalIndex]?.[field]) {
      const nextErrors = { ...inputErrors };
      nextErrors[globalIndex] = { ...nextErrors[globalIndex], [field]: undefined };
      if (!nextErrors[globalIndex].weight && !nextErrors[globalIndex].reps) delete nextErrors[globalIndex];
      dispatch({ type: 'SET_INPUT_ERRORS', value: nextErrors });
    }
  }

  function deleteSet(globalIndex: number) {
    dispatch({ type: 'SET_DELETED_INDICES', value: new Set([...deletedIndices, globalIndex]) });
    const nextInputs = [...inputs];
    nextInputs[globalIndex] = { weight: '', reps: '' };
    dispatch({ type: 'SET_INPUTS', value: nextInputs });
    const nextErrors = { ...inputErrors };
    delete nextErrors[globalIndex];
    dispatch({ type: 'SET_INPUT_ERRORS', value: nextErrors });
  }

  function validateInputs(): Record<number, { weight?: boolean; reps?: boolean }> {
    if (!log) return {};
    const errors: Record<number, { weight?: boolean; reps?: boolean }> = {};
    log.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId] ?? set.isBodyweight;
      if (isBw) return;
      const weightFilled = input.weight.trim() !== '';
      const repsFilled = input.reps.trim() !== '';
      if (weightFilled && !repsFilled) errors[i] = { reps: true };
      else if (!weightFilled && repsFilled) errors[i] = { weight: true };
    });
    return errors;
  }

  async function handleFinishClick() {
    if (!log || !logId) return;
    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_INPUT_ERRORS', value: errors });
      return;
    }
    const nonDeletedCount = log.sets.filter((_, i) => !deletedIndices.has(i)).length;
    if (nonDeletedCount > 0) {
      const hasAnyData = log.sets.some((set, i) => {
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
    dispatch({ type: 'SET_INPUT_ERRORS', value: {} });

    const setsToSave: { index: number; weight: number | null; reps: number | null }[] = [];
    log.sets.forEach((set, i) => {
      if (deletedIndices.has(i)) return;
      const input = inputs[i] ?? { weight: '', reps: '' };
      const isBw = bwOverrides[set.exerciseId] ?? set.isBodyweight;
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
      dispatch({ type: 'SET_SAVING_SETS', value: true });
      try {
        await Promise.all(
          setsToSave.map(({ index, weight, reps }) =>
            request(`/api/me/workout-logs/${logId}/sets/${index}`, {
              method: 'PATCH',
              body: JSON.stringify({ actualWeight: weight, actualReps: reps }),
            }),
          ),
        );
      } catch {
        toast.error('Failed to save sets');
        dispatch({ type: 'SET_SAVING_SETS', value: false });
        return;
      }
      dispatch({ type: 'SET_SAVING_SETS', value: false });
    }

    dispatch({ type: 'SET_COMPLETE_OPEN', value: true });
  }

  async function addSet(exerciseId: string) {
    if (!log || !logId) return;
    const exerciseSets = log.sets.filter((s) => s.exerciseId === exerciseId);
    const last = exerciseSets[exerciseSets.length - 1];
    if (!last) return;
    const newSet: SelfWorkoutSet = {
      ...last,
      setNumber: last.setNumber + 1,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    try {
      const next = await request<SelfWorkoutLog>(`/api/me/workout-logs/${logId}/sets`, {
        method: 'POST',
        body: JSON.stringify(newSet),
      });
      syncLog(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('404')) {
        toast.error('This session was ended on another device.');
        navigate(basePath);
      } else {
        toast.error('Failed to add set');
      }
    }
  }

  async function addExercise(option: ExerciseOption) {
    if (!log || !logId) return;
    const newSet = {
      exerciseId: option._id,
      exerciseName: option.name,
      groupId: typeof crypto !== 'undefined' && 'randomUUID' in crypto
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
    try {
      const next = await request<SelfWorkoutLog>(`/api/me/workout-logs/${logId}/sets`, {
        method: 'POST',
        body: JSON.stringify(newSet),
      });
      syncLog(next);
      dispatch({ type: 'SET_BW_OVERRIDES', value: { ...bwOverrides, [option._id]: option.isBodyweight } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('404')) {
        toast.error('This session was ended on another device.');
        navigate(basePath);
      } else {
        toast.error('Failed to add exercise');
      }
    }
  }

  const groups = useMemo(() => (log ? buildGroups(log) : []), [log]);

  function toLoggingSets(exSets: SetWithIndex[]): LoggingSetInput[] {
    return exSets.flatMap((s) =>
      deletedIndices.has(s.globalIndex)
        ? []
        : [{
            setNumber: s.setNumber,
            prescribedRepsMin: s.prescribedRepsMin ?? 0,
            prescribedRepsMax: s.prescribedRepsMax ?? 0,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            completedAt: s.completedAt,
            globalIndex: s.globalIndex,
          }],
    );
  }

  const filledSetCount = log
    ? log.sets.filter((_, i) => !deletedIndices.has(i) && (inputs[i]?.reps ?? '').trim() !== '').length
    : 0;
  const totalSetCount = log ? log.sets.length - deletedIndices.size : 0;

  if (loading) return <div className="p-6 text-foreground/65 text-sm">Loading…</div>;
  if (!log) return <div className="p-6 text-foreground/65 text-sm">Workout not found.</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        <div>
          <Link
            to={basePath}
            className="text-xs text-foreground/65 hover:text-foreground mb-1 block transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-base font-semibold text-foreground" data-testid="session-day-name">{log.dayName}</h1>
          {isFreestyle && (
            <div className="text-[10px] uppercase tracking-[1.6px] font-bold text-sky-300 mt-0.5">
              Freestyle
            </div>
          )}
        </div>
        {/* TIMER FIX: RestTimer is isolated — it holds its own ref to startedAt and never
            re-initializes when parent state changes (set logging, input changes, etc.) */}
        {isCompleted ? (
          <span className="text-sm font-mono font-semibold text-foreground/65 bg-muted rounded-md px-2 py-1">
            {staticDuration}
          </span>
        ) : startedAtIso ? (
          <RestTimer startedAtIso={startedAtIso} />
        ) : null}
      </div>

      <m.div
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
              <m.div
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
                    dispatch({ type: 'SET_BW_OVERRIDES', value: { ...bwOverrides, [group.exerciseId]: next } })
                  }
                  readOnly={isCompleted}
                  inputErrors={inputErrors}
                />
              </m.div>
            );
          }
          return (
            <m.div key={group.groupId} variants={variants.staggerItem}>
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
                  dispatch({ type: 'SET_BW_OVERRIDES', value: { ...bwOverrides, [exId]: next } })
                }
                readOnly={isCompleted}
              />
            </m.div>
          );
        })}

        {isFreestyle && !isCompleted && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_PICKER_OPEN', value: true })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 py-4 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          >
            + Add Exercise
          </button>
        )}
      </m.div>

      <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
          <span className="text-xs text-foreground/65 tabular-nums" data-testid="set-count">
            {totalSetCount === 0 ? 'No sets yet' : `${filledSetCount} / ${totalSetCount} sets filled`}
          </span>
          {isCompleted ? (
            <span className="text-xs text-foreground/65 tabular-nums">
              Completed {completedDateLabel} · {log.sets.length} sets · {staticDuration}
              {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
            </span>
          ) : (
            <Button
              onClick={() => void handleFinishClick()}
              disabled={savingSets}
              data-testid="finish-button"
            >
              {savingSets ? 'Saving…' : 'Finish'}
            </Button>
          )}
        </div>
      </div>

      <ExerciseSearchSheet
        open={pickerOpen}
        onOpenChange={(v) => dispatch({ type: 'SET_PICKER_OPEN', value: v })}
        exercises={availableExercises}
        onSelect={(ex) => void addExercise(ex)}
        onCreated={(ex) =>
          dispatch({ type: 'SET_AVAILABLE_EXERCISES', value: [...availableExercises, ex] })
        }
      />

      <CompleteWorkoutDialog
        open={completeOpen}
        onOpenChange={(v) => dispatch({ type: 'SET_COMPLETE_OPEN', value: v })}
        logId={logId ?? ''}
        onCompleted={() => navigate(basePath)}
      />
    </div>
  );
}
