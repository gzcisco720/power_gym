import { useCallback, useReducer } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { request } from '@/api/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logId: string;
  onCompleted: () => void;
}

interface State {
  rpe: string;
  note: string;
  submitting: boolean;
}

type Action =
  | { type: 'SET_RPE'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RPE': return { ...state, rpe: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_SUBMITTING': return { ...state, submitting: action.value };
    default: return state;
  }
}

export function CompleteWorkoutDialog({ open, onOpenChange, logId, onCompleted }: Props) {
  const [state, dispatch] = useReducer(reducer, { rpe: '', note: '', submitting: false });
  const { rpe, note, submitting } = state;

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v) {
        dispatch({ type: 'SET_RPE', value: '' });
        dispatch({ type: 'SET_NOTE', value: '' });
      }
      onOpenChange(v);
    },
    [onOpenChange],
  );

  async function submit() {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    try {
      await request(`/api/me/workout-logs/${logId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          rpe: rpe === '' ? null : parseInt(rpe, 10),
          note: note === '' ? null : note,
        }),
      });
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error('Failed to finish workout');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish workout</DialogTitle>
        </DialogHeader>
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
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="text-xs text-foreground/65 block">
            Note (optional)
            <textarea
              aria-label="Note"
              value={note}
              onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-foreground"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting} className="flex-1">
            {submitting ? 'Finishing…' : 'Finish workout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
