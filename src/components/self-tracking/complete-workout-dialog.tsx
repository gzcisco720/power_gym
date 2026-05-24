'use client';

import { useCallback, useReducer } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';
import { WorkoutCompleteAnimation } from '@/components/animations/workout-complete';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logId: string;
  onCompleted: () => void;
}

interface CompleteWorkoutDialogState {
  rpe: string;
  note: string;
  save: { name: string; description: string } | null;
  submitting: boolean;
  showAnimation: boolean;
}

type CompleteWorkoutDialogAction =
  | { type: 'SET_RPE'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_SAVE'; value: { name: string; description: string } | null }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_SHOW_ANIMATION'; value: boolean };

function completeWorkoutDialogReducer(state: CompleteWorkoutDialogState, action: CompleteWorkoutDialogAction): CompleteWorkoutDialogState {
  switch (action.type) {
    case 'SET_RPE': return { ...state, rpe: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_SAVE': return { ...state, save: action.value };
    case 'SET_SUBMITTING': return { ...state, submitting: action.value };
    case 'SET_SHOW_ANIMATION': return { ...state, showAnimation: action.value };
    default: return state;
  }
}

export function CompleteWorkoutDialog({ open, onOpenChange, logId, onCompleted }: Props) {
  const [state, dispatch] = useReducer(completeWorkoutDialogReducer, {
    rpe: '', note: '', save: null, submitting: false, showAnimation: true,
  });
  const { rpe, note, save, submitting, showAnimation } = state;
  const handleAnimationComplete = useCallback(() => dispatch({ type: 'SET_SHOW_ANIMATION', value: false }), []);

  const canSubmit = save === null || save.name.trim() !== '';

  async function submit() {
    if (!canSubmit) return;
    dispatch({ type: 'SET_SUBMITTING', value: true });
    const body: Record<string, unknown> = {
      rpe: rpe === '' ? null : parseInt(rpe, 10),
      note: note === '' ? null : note,
    };
    if (save) {
      body.saveAsTemplate = {
        name: save.name.trim(),
        description: save.description.trim() || undefined,
      };
    }
    const res = await fetch(`/api/me/workout-logs/${logId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    dispatch({ type: 'SET_SUBMITTING', value: false });
    if (res.ok) {
      const data = (await res.json()) as { createdTemplateId?: string };
      if (data.createdTemplateId) toast.success('Saved as template');
      onOpenChange(false);
      onCompleted();
    } else {
      toast.error('Failed to finish workout');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish workout</DialogTitle>
        </DialogHeader>
        {showAnimation ? (
          <WorkoutCompleteAnimation onComplete={handleAnimationComplete} />
        ) : (
          <>
            <div className="space-y-3">
              <label className="text-xs text-foreground/65 block">
                RPE (optional)
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="RPE"
                  value={rpe}
                  onChange={(e) => dispatch({ type: 'SET_RPE', value: e.target.value })}
                  className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-foreground/65 block">
                Note (optional)
                <textarea
                  aria-label="Note"
                  value={note}
                  onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
                  className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
                />
              </label>
              <SaveAsTemplateCheckbox value={save} onChange={(v) => dispatch({ type: 'SET_SAVE', value: v })} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting || !canSubmit} className="flex-1">
                Finish workout
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
