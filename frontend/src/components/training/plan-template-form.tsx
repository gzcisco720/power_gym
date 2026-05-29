import { useEffect, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: PlanExercise[];
}

export interface PlanExercise {
  exerciseId: string;
  exerciseName?: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export interface PlanFormPayload {
  name: string;
  description: string | null;
  days: PlanDay[];
}

export interface PlanTemplateFormProps {
  initialData?: { name: string; description: string | null; days: PlanDay[] };
  onSubmit: (data: PlanFormPayload) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  planId?: string;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  description: string;
  days: PlanDay[];
  activeDay: number;
  saving: boolean;
  discardDialog: boolean;
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_DAYS'; value: PlanDay[] }
  | { type: 'SET_ACTIVE_DAY'; value: number }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_DISCARD_DIALOG'; value: boolean };

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DESCRIPTION': return { ...state, description: action.value };
    case 'SET_DAYS': return { ...state, days: action.value };
    case 'SET_ACTIVE_DAY': return { ...state, activeDay: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_DISCARD_DIALOG': return { ...state, discardDialog: action.value };
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// PlanTemplateForm
// ---------------------------------------------------------------------------

export function PlanTemplateForm({ initialData, onSubmit, onCancel, mode = 'create' }: PlanTemplateFormProps) {
  const [state, dispatch] = useReducer(reducer, {
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    days: initialData?.days ?? [],
    activeDay: 0,
    saving: false,
    discardDialog: false,
  });
  const { name, description, days, activeDay, saving, discardDialog } = state;

  const isEditMode = mode === 'edit';

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialData?.name ?? '',
        description: initialData?.description || '',
        days: initialData?.days ?? [],
      }),
    [initialData],
  );

  const isDirty = useMemo(
    () =>
      JSON.stringify({ name, description, days }) !== initialSnapshot,
    [name, description, days, initialSnapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    function handle(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty]);

  // ---- Day operations -------------------------------------------------------

  function addDay() {
    const num = days.length + 1;
    const newDay: PlanDay = { dayNumber: num, name: `Day ${num}`, exercises: [] };
    dispatch({ type: 'SET_DAYS', value: [...days, newDay] });
    dispatch({ type: 'SET_ACTIVE_DAY', value: days.length });
  }

  function removeDay(dayIdx: number) {
    const next = days.filter((_, i) => i !== dayIdx).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    dispatch({ type: 'SET_DAYS', value: next });
    dispatch({ type: 'SET_ACTIVE_DAY', value: Math.max(0, Math.min(activeDay, next.length - 1)) });
  }

  function updateDayName(dayIdx: number, value: string) {
    dispatch({ type: 'SET_DAYS', value: days.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)) });
  }

  // ---- Exercise operations --------------------------------------------------

  function addExercise(dayIdx: number) {
    const ex: PlanExercise = {
      exerciseId: crypto.randomUUID(),
      exerciseName: '',
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
    };
    dispatch({
      type: 'SET_DAYS',
      value: days.map((d, i) => (i === dayIdx ? { ...d, exercises: [...d.exercises, ex] } : d)),
    });
  }

  function updateExerciseField(dayIdx: number, exId: string, field: keyof PlanExercise, value: string | number | null) {
    dispatch({
      type: 'SET_DAYS',
      value: days.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.exerciseId === exId ? { ...ex, [field]: value } : ex,
          ),
        };
      }),
    });
  }

  function deleteExercise(dayIdx: number, exId: string) {
    dispatch({
      type: 'SET_DAYS',
      value: days.map((d, i) =>
        i === dayIdx ? { ...d, exercises: d.exercises.filter((ex) => ex.exerciseId !== exId) } : d,
      ),
    });
  }

  // ---- Submit ---------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        days,
      });
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  function handleCancel() {
    if (isDirty) {
      dispatch({ type: 'SET_DISCARD_DIALOG', value: true });
      return;
    }
    onCancel?.();
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 max-w-3xl mx-auto px-4 sm:px-8 py-5">
      {/* Meta card */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="plan-name"
            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            Plan Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="plan-name"
            aria-label="Plan Name"
            value={name}
            onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
            required
            placeholder="e.g. 5-Day Strength Program"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="plan-desc"
            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            Description <span className="text-foreground/65 normal-case tracking-normal">(optional)</span>
          </label>
          <Textarea
            id="plan-desc"
            value={description}
            onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', value: e.target.value })}
            rows={2}
            className="resize-none"
            placeholder="Optional notes about this plan…"
          />
        </div>
      </div>

      {/* Days — only visible in edit mode (API does not support days on create) */}
      {mode === 'create' ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 text-center">
          <p className="text-sm text-foreground/65">Save to create the template, then edit it to add training days and exercises.</p>
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center space-y-3">
          <p className="text-sm text-foreground/65">No training days yet.</p>
          <Button type="button" variant="outline" onClick={addDay}>
            <Plus className="size-4 mr-1" /> Add Day
          </Button>
        </div>
      ) : (
        <Tabs
          value={String(activeDay)}
          onValueChange={(v) => dispatch({ type: 'SET_ACTIVE_DAY', value: parseInt(v, 10) })}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabsList className="flex-shrink-0">
              {days.map((d, i) => (
                <TabsTrigger key={d.dayNumber} value={String(i)}>
                  {d.name || `Day ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button type="button" variant="outline" size="sm" onClick={addDay} className="shrink-0 h-8">
              + Add Day
            </Button>
          </div>

          {days.map((day, dayIdx) => (
            <TabsContent key={day.dayNumber} value={String(dayIdx)}>
              <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`Day ${dayIdx + 1}`}
                    value={day.name}
                    onChange={(e) => updateDayName(dayIdx, e.target.value)}
                    aria-label={`Day ${dayIdx + 1} name`}
                    className="flex-1 text-sm"
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

                {/* Exercise list */}
                <div className="space-y-2">
                  {day.exercises.map((ex) => (
                    <div key={ex.exerciseId} className="rounded-lg bg-muted/30 ring-1 ring-foreground/[.06] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Exercise name"
                          value={ex.exerciseName ?? ''}
                          onChange={(e) => updateExerciseField(dayIdx, ex.exerciseId, 'exerciseName', e.target.value)}
                          aria-label="Exercise name"
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteExercise(dayIdx, ex.exerciseId)}
                          aria-label="Delete exercise"
                          className="shrink-0 text-foreground/40 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label htmlFor={`sets-${ex.exerciseId}`} className="text-[10px] uppercase tracking-wider text-foreground/65">Sets</label>
                          <Input
                            id={`sets-${ex.exerciseId}`}
                            type="text"
                            inputMode="decimal"
                            value={ex.sets}
                            onChange={(e) => updateExerciseField(dayIdx, ex.exerciseId, 'sets', parseInt(e.target.value, 10) || 0)}
                            className="text-sm tabular-nums"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`repsMin-${ex.exerciseId}`} className="text-[10px] uppercase tracking-wider text-foreground/65">Reps Min</label>
                          <Input
                            id={`repsMin-${ex.exerciseId}`}
                            type="text"
                            inputMode="decimal"
                            value={ex.repsMin}
                            onChange={(e) => updateExerciseField(dayIdx, ex.exerciseId, 'repsMin', parseInt(e.target.value, 10) || 0)}
                            className="text-sm tabular-nums"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`repsMax-${ex.exerciseId}`} className="text-[10px] uppercase tracking-wider text-foreground/65">Reps Max</label>
                          <Input
                            id={`repsMax-${ex.exerciseId}`}
                            type="text"
                            inputMode="decimal"
                            value={ex.repsMax}
                            onChange={(e) => updateExerciseField(dayIdx, ex.exerciseId, 'repsMax', parseInt(e.target.value, 10) || 0)}
                            className="text-sm tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addExercise(dayIdx)}
                  className="w-full rounded-lg border border-dashed border-foreground/15 py-2.5 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                >
                  + Add Exercise
                </button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-10 flex items-center gap-2 px-4 sm:px-8 py-3 border-t border-foreground/10 backdrop-blur-md bg-background/50 -mx-4 sm:-mx-8">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="text-foreground/65"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || (isEditMode && !isDirty)}
          className="ml-auto"
        >
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
      </div>

      {/* Discard dialog */}
      <Dialog open={discardDialog} onOpenChange={(v) => dispatch({ type: 'SET_DISCARD_DIALOG', value: v })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>You have unsaved edits. Leaving will discard them.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type: 'SET_DISCARD_DIALOG', value: false })}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'SET_DISCARD_DIALOG', value: false });
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
