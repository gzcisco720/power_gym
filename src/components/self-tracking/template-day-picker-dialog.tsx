'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

interface TemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

interface TemplateDay {
  dayNumber: number;
  name: string;
  exercises: TemplateExercise[];
}

interface PlanTemplate {
  _id: string;
  name: string;
  days: TemplateDay[];
}

interface PickResult {
  templateId: string;
  dayNumber: number;
  dayName: string;
  plannedSets: ISelfWorkoutSet[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (result: PickResult) => void;
}

// Inner component — only rendered while the dialog is open, so it always
// mounts fresh with `loading = true` and no reset logic is needed.
function PickerContent({
  onOpenChange,
  onPick,
}: {
  onOpenChange: (v: boolean) => void;
  onPick: (result: PickResult) => void;
}) {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<PlanTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/plan-templates')
      .then((r) => r.json())
      .then((d: PlanTemplate[]) => {
        if (!cancelled) {
          setTemplates(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function pickDay(day: TemplateDay) {
    if (!selectedTpl) return;
    const plannedSets: ISelfWorkoutSet[] = day.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        // exerciseId must be an ObjectId on the server side; the cast is acceptable at the route boundary.
        exerciseId: ex.exerciseId as unknown as ISelfWorkoutSet['exerciseId'],
        exerciseName: ex.exerciseName,
        groupId: ex.groupId,
        isSuperset: ex.isSuperset,
        isBodyweight: ex.isBodyweight,
        setNumber: i + 1,
        prescribedRepsMin: ex.repsMin,
        prescribedRepsMax: ex.repsMax,
        actualWeight: null,
        actualReps: null,
        completedAt: null,
      })),
    );
    onPick({
      templateId: selectedTpl._id,
      dayNumber: day.dayNumber,
      dayName: day.name,
      plannedSets,
    });
    onOpenChange(false);
  }

  if (loading) {
    return <div className="text-sm text-foreground/65 py-4 text-center">Loading…</div>;
  }

  if (!selectedTpl) {
    return (
      <div className="space-y-1.5">
        {templates.length === 0 ? (
          <div className="text-sm text-foreground/65 py-4 text-center">No templates yet.</div>
        ) : (
          templates.map((t) => (
            <Button
              key={t._id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setSelectedTpl(t)}
            >
              {t.name}
            </Button>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {selectedTpl.days.map((d) => (
        <Button
          key={d.dayNumber}
          variant="ghost"
          className="w-full justify-start"
          onClick={() => pickDay(d)}
        >
          Day {d.dayNumber} — {d.name}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedTpl(null)}
        className="text-foreground/65"
      >
        ← Back
      </Button>
    </div>
  );
}

export function TemplateDayPickerDialog({ open, onOpenChange, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {open ? 'Pick a template' : ''}
          </DialogTitle>
        </DialogHeader>
        {open && <PickerContent onOpenChange={onOpenChange} onPick={onPick} />}
      </DialogContent>
    </Dialog>
  );
}
