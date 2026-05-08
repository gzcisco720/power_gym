'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logId: string;
  onCompleted: () => void;
}

export function CompleteWorkoutDialog({ open, onOpenChange, logId, onCompleted }: Props) {
  const [rpe, setRpe] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [save, setSave] = useState<{ name: string; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = save === null || save.name.trim() !== '';

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
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
    setSubmitting(false);
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
        <div className="space-y-3">
          <label className="text-xs text-foreground/65 block">
            RPE (optional)
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="RPE"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-xs text-foreground/65 block">
            Note (optional)
            <textarea
              aria-label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
          <SaveAsTemplateCheckbox value={save} onChange={setSave} />
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !canSubmit} className="flex-1">
            Finish workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
