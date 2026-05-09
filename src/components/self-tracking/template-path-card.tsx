'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TemplateDayPickerDialog } from '@/components/self-tracking/template-day-picker-dialog';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type BasePath = '/trainer/my-training' | '/owner/my-training';

interface ExercisePreview {
  name: string;
  prescribed: string;
  lastWeight: number | null;
}
interface DataPropsBase {
  templateId: string;
  templateName: string;
  nextDay: { dayNumber: number; dayName: string };
  cycleSize: number;
  completedDayNumbers: number[];
  exercisePreview: ExercisePreview[];
  plannedSets: ISelfWorkoutSet[];
  basePath: BasePath;
}
interface FullProps extends DataPropsBase {
  state: 'full';
}
interface LightProps extends DataPropsBase {
  state: 'light';
}

export interface UserTemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}
export interface UserTemplateDay {
  dayNumber: number;
  name: string;
  exercises: UserTemplateExercise[];
}
export interface UserTemplate {
  _id: string;
  name: string;
  days: UserTemplateDay[];
}

interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
  templates: UserTemplate[];
}
type Props = FullProps | LightProps | EmptyProps;

export function TemplatePathCard(props: Props) {
  if (props.state === 'empty') return <EmptyCard {...props} />;
  return <DataCard {...props} />;
}

function DataCard(props: FullProps | LightProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const eyebrow = props.state === 'full' ? 'Next in rotation' : 'Repeat or rotate';

  async function start(payload: {
    templateId: string;
    dayNumber: number;
    dayName: string;
    plannedSets: ISelfWorkoutSet[];
  }) {
    setStarting(true);
    try {
      const res = await fetch('/api/me/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: payload.dayName,
          sourceTemplateId: payload.templateId,
          sourceTemplateDayNumber: payload.dayNumber,
          plannedSets: payload.plannedSets,
        }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${props.basePath}/session/${log._id}`);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">{eyebrow}</span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">From template</span>
      </div>
      <div className="mb-1">
        <div className="text-[11px] text-foreground/65 tabular-nums">{props.templateName}</div>
        <h2 className="text-xl font-bold leading-tight mt-0.5">
          Day {props.nextDay.dayNumber} — {props.nextDay.dayName}
        </h2>
      </div>
      <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 space-y-1.5 my-3 bg-foreground/5">
        {props.exercisePreview.map((ex, i) => (
          <div key={i} className="flex items-center justify-between text-[12px] tabular-nums">
            <span>{ex.name}</span>
            <span className="text-foreground/65">{ex.prescribed}</span>
            {props.state === 'full' && ex.lastWeight != null ? (
              <span className="text-foreground/65 w-16 text-right">last {ex.lastWeight}kg</span>
            ) : (
              <span className="w-16" />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-[3px]">
          {Array.from({ length: props.cycleSize }).map((_, i) => {
            const dn = i + 1;
            const done = props.completedDayNumbers.includes(dn);
            const isNext = dn === props.nextDay.dayNumber;
            return (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  done
                    ? 'bg-emerald-400'
                    : isNext
                      ? 'bg-emerald-400/40 ring-1 ring-emerald-400/40'
                      : 'bg-foreground/10'
                }`}
              />
            );
          })}
        </div>
        <span className="text-[11px] text-foreground/65 tabular-nums">
          <span className="text-foreground font-semibold">{props.nextDay.dayNumber}</span> / {props.cycleSize}
        </span>
      </div>
      <div className="mt-auto flex gap-2">
        <Button
          disabled={starting}
          onClick={() =>
            start({
              templateId: props.templateId,
              dayNumber: props.nextDay.dayNumber,
              dayName: props.nextDay.dayName,
              plannedSets: props.plannedSets,
            })
          }
          className="flex-1"
        >
          {starting ? 'Starting…' : `Start Day ${props.nextDay.dayNumber} →`}
        </Button>
        <Button variant="outline" disabled={starting} onClick={() => setPickerOpen(true)}>
          Pick another day
        </Button>
      </div>
      <TemplateDayPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={async ({ templateId, dayNumber, dayName, plannedSets }) => {
          await start({ templateId, dayNumber, dayName, plannedSets });
        }}
      />
    </div>
  );
}

function buildPlannedSets(day: UserTemplateDay): ISelfWorkoutSet[] {
  return day.exercises.flatMap((ex) =>
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
}

function EmptyCard({ basePath, templates }: EmptyProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const plansBase = basePath.replace('/my-training', '/plans');
  const selected = templates.find((t) => t._id === selectedId) ?? null;
  const hasTemplates = templates.length > 0;

  async function startDay(day: UserTemplateDay) {
    if (!selected) return;
    setStarting(true);
    try {
      const res = await fetch('/api/me/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: day.name,
          sourceTemplateId: selected._id,
          sourceTemplateDayNumber: day.dayNumber,
          plannedSets: buildPlannedSets(day),
        }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${basePath}/session/${log._id}`);
      }
    } finally {
      setStarting(false);
    }
  }

  function handleStart() {
    if (!selected) return;
    if (selected.days.length === 1) {
      void startDay(selected.days[0]);
    } else {
      setPickerOpen(true);
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">Follow a plan</span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">From template</span>
      </div>
      <div className="mb-3">
        <h2 className="text-xl font-bold leading-tight">Pick a template</h2>
        <p className="text-xs text-foreground/65 mt-1 leading-snug">
          Walk through prescribed exercises, sets, and reps. Best when you want structure or are starting a cycle.
        </p>
      </div>
      <div className="rounded-lg ring-1 ring-foreground/10 mb-3 bg-foreground/5 max-h-44 overflow-y-auto">
        {hasTemplates ? (
          <ul role="listbox" aria-label="Templates" className="divide-y divide-foreground/5">
            {templates.map((t) => {
              const isSelected = t._id === selectedId;
              return (
                <li key={t._id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(t._id)}
                    className={`w-full flex items-center justify-between text-[12px] px-2.5 py-2 transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40 ring-inset'
                        : 'hover:bg-foreground/10'
                    }`}
                  >
                    <div>
                      <div>{t.name}</div>
                      <div className="text-[10px] text-foreground/65 tabular-nums">
                        {t.days.length} day{t.days.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    {isSelected && <span className="text-emerald-300 text-sm" aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-foreground/65 px-3 py-4 text-center">
            No templates yet — create your first to start logging.
          </p>
        )}
      </div>
      <div className="mt-auto flex gap-2">
        <Button
          className="flex-1"
          disabled={!selected || starting}
          onClick={handleStart}
        >
          {starting ? 'Starting…' : 'Start to log →'}
        </Button>
        <Button variant="outline" onClick={() => router.push(`${plansBase}/new`)}>
          + Create
        </Button>
      </div>

      {selected && selected.days.length > 1 && (
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pick a day — {selected.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              {selected.days.map((d) => (
                <Button
                  key={d.dayNumber}
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={starting}
                  onClick={() => {
                    setPickerOpen(false);
                    void startDay(d);
                  }}
                >
                  Day {d.dayNumber} — {d.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
