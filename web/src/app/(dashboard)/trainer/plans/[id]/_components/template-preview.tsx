'use client';

import { useState } from 'react';
import { DayTabs } from '@/components/training/day-tabs';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import { labelExercises } from '@/lib/training/label-exercises';

interface DaySnapshot {
  dayNumber: number;
  name: string;
  exercises: ExerciseRowData[];
}

interface Props {
  days: DaySnapshot[];
}

export function TemplatePreview({ days }: Props) {
  const [activeDay, setActiveDay] = useState(0);

  if (days.length === 0) {
    return <p className="text-sm text-foreground/65">This template has no training days.</p>;
  }

  const day = days[activeDay];
  const labelled = labelExercises(day.exercises);

  type Slot =
    | { kind: 'standalone'; exercise: (typeof labelled)[number] }
    | { kind: 'superset'; groupId: string; members: { row: ExerciseRowData; label: string }[] };

  const slots: Slot[] = [];
  const seen = new Set<string>();
  labelled.forEach((ex) => {
    if (!ex.isSuperset) {
      slots.push({ kind: 'standalone', exercise: ex });
    } else if (!seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      slots.push({
        kind: 'superset',
        groupId: ex.groupId,
        members: labelled.flatMap((e) =>
          e.isSuperset && e.groupId === ex.groupId
            ? [{ row: e as ExerciseRowData, label: e.label }]
            : [],
        ),
      });
    }
  });

  return (
    <div className="space-y-3">
      <DayTabs
        days={days.map((d) => ({ dayNumber: d.dayNumber, name: d.name }))}
        activeIndex={activeDay}
        onChange={setActiveDay}
        onAddDay={() => {}}
        readOnly
      />
      <div className="space-y-2">
        {slots.map((slot) => {
          if (slot.kind === 'standalone') {
            return (
              <ExerciseRow
                key={slot.exercise.exerciseId}
                mode="view"
                row={slot.exercise as ExerciseRowData}
                label={slot.exercise.label}
              />
            );
          }
          return (
            <SupersetBlock
              key={slot.groupId}
              mode="view"
              groupId={slot.groupId}
              viewMembers={slot.members}
            />
          );
        })}
      </div>
    </div>
  );
}
