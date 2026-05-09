'use client';

import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

export interface ExerciseRowData {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  groupId: string;
  isSuperset: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export type RowMode = 'edit' | 'logging' | 'view';
export type RowPosition = 'first' | 'middle' | 'last' | 'only';

export interface LoggingSetInput {
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
  globalIndex: number;
}

interface BaseProps {
  row: ExerciseRowData;
  label: string;
  inSuperset?: boolean;
}

interface EditProps extends BaseProps {
  mode: 'edit';
  position: RowPosition;
  onChange: (field: keyof ExerciseRowData, value: ExerciseRowData[keyof ExerciseRowData]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  hasError?: boolean;
}

interface LoggingProps extends BaseProps {
  mode: 'logging';
  loggingSets: LoggingSetInput[];
  inputs: { weight: string; reps: string }[];
  onInputChange: (globalIndex: number, field: 'weight' | 'reps', value: string) => void;
  onLogSet: (globalIndex: number) => void;
  onAddSet: () => void;
  onBwToggle: (next: boolean) => void;
  bwOverride?: boolean;
}

interface ViewProps extends BaseProps {
  mode: 'view';
}

type Props = EditProps | LoggingProps | ViewProps;

function NumberField({
  label,
  id,
  value,
  onChange,
  suffix,
  width = 'w-12',
}: {
  label: string;
  id: string;
  value: number | null;
  onChange: (n: number | null) => void;
  suffix?: string;
  width?: string;
}) {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-wider text-foreground/65 mb-0.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return onChange(null);
            const n = Number(v);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className={cn(
            'h-7 text-xs bg-card ring-1 ring-foreground/10 rounded-md text-foreground px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            width,
            suffix ? 'pr-5' : '',
          )}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-foreground/65 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function ExerciseRow(props: Props) {
  const { row, label, inSuperset = false, mode } = props;

  if (mode === 'edit') {
    const { position, onChange, onMoveUp, onMoveDown, onDelete, hasError } = props;
    const moveUpDisabled = position === 'first' || position === 'only';
    const moveDownDisabled = position === 'last' || position === 'only';

    return (
      <div
        data-testid="exercise-row"
        className={cn(
          'px-3 py-2.5 transition',
          inSuperset
            ? ''
            : 'rounded-lg bg-card ring-1 ring-foreground/10 hover:ring-foreground/25',
          hasError && 'ring-destructive/40',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ExerciseBadge label={label} />
          <ExerciseThumbnail imageUrl={row.imageUrl} name={row.exerciseName} size={36} />
          <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
            {row.exerciseName}
          </span>

          <div className="flex items-center gap-1 ml-auto sm:ml-0 order-3 sm:order-none shrink-0">
            <button
              type="button"
              aria-label="Move up"
              disabled={moveUpDisabled}
              onClick={onMoveUp}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-foreground rounded-md disabled:opacity-30 disabled:pointer-events-none cursor-pointer disabled:cursor-default"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={moveDownDisabled}
              onClick={onMoveDown}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-foreground rounded-md disabled:opacity-30 disabled:pointer-events-none cursor-pointer disabled:cursor-default"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remove exercise"
              onClick={onDelete}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-destructive rounded-md cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-end gap-2 flex-wrap basis-full sm:basis-auto sm:order-none order-2 sm:ml-2">
            <NumberField
              label="Sets"
              id={`sets-${row.exerciseId}-${row.groupId}`}
              value={row.sets}
              onChange={(n) => onChange('sets', n ?? 0)}
            />
            <NumberField
              label="Reps Min"
              id={`reps-min-${row.exerciseId}-${row.groupId}`}
              value={row.repsMin}
              onChange={(n) => onChange('repsMin', n ?? 0)}
            />
            <span className="text-foreground/65 self-end pb-1">–</span>
            <NumberField
              label="Reps Max"
              id={`reps-max-${row.exerciseId}-${row.groupId}`}
              value={row.repsMax}
              onChange={(n) => onChange('repsMax', n ?? 0)}
            />
            <NumberField
              label="Rest"
              id={`rest-${row.exerciseId}-${row.groupId}`}
              value={row.restSeconds}
              onChange={(n) => onChange('restSeconds', n)}
              suffix="s"
              width="w-16"
            />
            <label className="inline-flex items-center gap-1.5 text-xs text-foreground/65 cursor-pointer select-none mb-0.5">
              <input
                type="checkbox"
                aria-label="BW"
                checked={row.isBodyweight}
                onChange={(e) => onChange('isBodyweight', e.target.checked)}
                className="accent-foreground"
              />
              BW
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'logging') {
    const { loggingSets, inputs, onInputChange, onLogSet, onAddSet, onBwToggle, bwOverride } = props;
    const isBw = bwOverride ?? row.isBodyweight;
    const completedCount = loggingSets.length;
    const repsLabel =
      row.repsMin === row.repsMax ? `${row.repsMin}` : `${row.repsMin}–${row.repsMax}`;
    // Freestyle sets carry no prescribed reps range — both bounds land at 0.
    const hasPrescribedReps = row.repsMin > 0 || row.repsMax > 0;

    return (
      <div className="px-3 py-3" data-testid="exercise-row">
        <div className="flex items-center gap-2.5 mb-2.5">
          <ExerciseBadge label={label} />
          <ExerciseThumbnail imageUrl={row.imageUrl} name={row.exerciseName} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{row.exerciseName}</p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                Sets: {completedCount}
              </span>
              {hasPrescribedReps && (
                <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                  Reps: {repsLabel}
                </span>
              )}
            </div>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-foreground/65 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              aria-label="BW"
              checked={isBw}
              onChange={(e) => onBwToggle(e.target.checked)}
              className="accent-foreground"
            />
            BW
          </label>
        </div>

        <div className="space-y-1.5">
          {loggingSets.map((s) => {
            const done = s.completedAt !== null;
            return (
              <div
                key={s.globalIndex}
                className={cn('flex items-center gap-2', done && 'opacity-60')}
              >
                <span className="text-[11px] text-foreground/65 w-5 shrink-0 font-mono">
                  {String(s.setNumber).padStart(2, '0')}
                </span>
                {done ? (
                  <>
                    <span className="flex-1 text-xs text-foreground/65">
                      {!isBw && s.actualWeight !== null ? `${s.actualWeight} kg × ` : ''}
                      {s.actualReps !== null ? `${s.actualReps} reps` : '–'}
                    </span>
                    <span
                      className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md bg-foreground/10 text-foreground text-[10px]"
                      aria-label={`Set ${s.setNumber} completed`}
                    >
                      ✓
                    </span>
                  </>
                ) : (
                  <>
                    {!isBw ? (
                      <input
                        aria-label={`Set ${s.setNumber} weight`}
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="kg"
                        value={inputs[s.globalIndex]?.weight ?? ''}
                        onChange={(e) => onInputChange(s.globalIndex, 'weight', e.target.value)}
                        className="h-7 w-16 text-xs bg-card ring-1 ring-foreground/10 rounded-md text-foreground px-2 placeholder:text-foreground/40"
                      />
                    ) : (
                      <span className="h-7 w-16 shrink-0 inline-flex items-center justify-center rounded-md ring-1 ring-foreground/10 text-[10px] text-foreground/50">
                        BW
                      </span>
                    )}
                    <input
                      aria-label={`Set ${s.setNumber} reps`}
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="reps"
                      value={inputs[s.globalIndex]?.reps ?? ''}
                      onChange={(e) => onInputChange(s.globalIndex, 'reps', e.target.value)}
                      className="h-7 flex-1 text-xs bg-card ring-1 ring-foreground/10 rounded-md text-foreground px-2 placeholder:text-foreground/40"
                    />
                    <button
                      type="button"
                      onClick={() => onLogSet(s.globalIndex)}
                      className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md ring-1 ring-foreground/25 text-foreground/65 hover:text-foreground hover:ring-foreground cursor-pointer"
                      aria-label={`Complete set ${s.setNumber}`}
                    >
                      ✓
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddSet}
          className="mt-2 text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
        >
          + Add Set
        </button>
      </div>
    );
  }

  // mode === 'view'
  const repsLabel =
    row.repsMin === row.repsMax ? `${row.repsMin}` : `${row.repsMin}–${row.repsMax}`;
  const hasPrescribedRepsView = row.repsMin > 0 || row.repsMax > 0;
  return (
    <div
      data-testid="exercise-row"
      className={
        inSuperset
          ? 'px-3 py-2.5'
          : 'px-3 py-2.5 rounded-lg bg-card ring-1 ring-foreground/10'
      }
    >
      <div className="flex items-center gap-2.5">
        <ExerciseBadge label={label} />
        <ExerciseThumbnail imageUrl={row.imageUrl} name={row.exerciseName} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{row.exerciseName}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
              Sets: {row.sets}
            </span>
            {hasPrescribedRepsView && (
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                Reps: {repsLabel}
              </span>
            )}
            {row.restSeconds !== null && (
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                Rest: {row.restSeconds}s
              </span>
            )}
            {row.isBodyweight && (
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                BW
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
