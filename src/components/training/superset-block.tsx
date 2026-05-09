'use client';

import { Fragment, useState } from 'react';
import {
  ExerciseRow,
  type ExerciseRowData,
  type LoggingSetInput,
} from '@/components/training/exercise-row';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface SupersetMember {
  row: ExerciseRowData;
  label: string;
}

export interface SupersetLoggingMember {
  row: ExerciseRowData;
  label: string;
  loggingSets: LoggingSetInput[];
  inputs: { weight: string; reps: string }[];
  bwOverride?: boolean;
}

interface BaseProps {
  groupId: string;
}

interface EditProps extends BaseProps {
  mode: 'edit';
  members: SupersetMember[];
  onChangeRow: (
    rowExerciseId: string,
    field: keyof ExerciseRowData,
    value: ExerciseRowData[keyof ExerciseRowData],
  ) => void;
  onMoveRow: (rowExerciseId: string, dir: 'up' | 'down') => void;
  onDeleteRow: (rowExerciseId: string) => void;
  onAddToSuperset: () => void;
  onUngroup: () => void;
  onDeleteSuperset: () => void;
  errorRowIds?: Set<string>;
}

interface LoggingProps extends BaseProps {
  mode: 'logging';
  loggingMembers: SupersetLoggingMember[];
  onInputChange: (
    memberExerciseId: string,
    globalIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  onLogSet: (memberExerciseId: string, globalIndex: number) => void;
  onAddSet: (memberExerciseId: string) => void;
  onBwToggle: (memberExerciseId: string, next: boolean) => void;
}

interface ViewProps extends BaseProps {
  mode: 'view';
  viewMembers: SupersetMember[];
}

type Props = EditProps | LoggingProps | ViewProps;

export function SupersetBlock(props: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (props.mode === 'edit') {
    const {
      members,
      onChangeRow,
      onMoveRow,
      onDeleteRow,
      onAddToSuperset,
      onUngroup,
      onDeleteSuperset,
      errorRowIds,
    } = props;

    return (
      <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
        <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">
            Superset
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onUngroup}
              className="text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
            >
              Ungroup
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-foreground/65 hover:text-destructive transition-colors cursor-pointer"
            >
              Delete superset
            </button>
          </div>
        </div>

        {members.map((m, i) => {
          const position =
            members.length === 1
              ? 'only'
              : i === 0
                ? 'first'
                : i === members.length - 1
                  ? 'last'
                  : 'middle';
          return (
            <Fragment key={m.row.exerciseId}>
              {i > 0 && <div className="h-px bg-foreground/10" />}
              <ExerciseRow
                mode="edit"
                row={m.row}
                label={m.label}
                position={position}
                inSuperset
                onChange={(field, value) => onChangeRow(m.row.exerciseId, field, value)}
                onMoveUp={() => onMoveRow(m.row.exerciseId, 'up')}
                onMoveDown={() => onMoveRow(m.row.exerciseId, 'down')}
                onDelete={() => onDeleteRow(m.row.exerciseId)}
                hasError={errorRowIds?.has(m.row.exerciseId)}
              />
            </Fragment>
          );
        })}

        <button
          type="button"
          onClick={onAddToSuperset}
          className="block w-full px-3 py-2 border-t border-foreground/10 text-xs text-foreground/65 hover:text-foreground transition-colors text-left cursor-pointer"
        >
          + Add to Superset
        </button>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this superset?</DialogTitle>
              <DialogDescription>
                All {members.length} exercise{members.length === 1 ? '' : 's'} in this superset will
                be removed from the day.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(false);
                  onDeleteSuperset();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (props.mode === 'logging') {
    const { loggingMembers, onInputChange, onLogSet, onAddSet, onBwToggle } = props;
    return (
      <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
        <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">
            Superset
          </span>
        </div>
        {loggingMembers.map((m, i) => (
          <Fragment key={m.row.exerciseId}>
            {i > 0 && <div className="h-px bg-foreground/10" />}
            <ExerciseRow
              mode="logging"
              row={m.row}
              label={m.label}
              loggingSets={m.loggingSets}
              inputs={m.inputs}
              bwOverride={m.bwOverride}
              onInputChange={(idx, field, value) =>
                onInputChange(m.row.exerciseId, idx, field, value)
              }
              onLogSet={(idx) => onLogSet(m.row.exerciseId, idx)}
              onAddSet={() => onAddSet(m.row.exerciseId)}
              onBwToggle={(next) => onBwToggle(m.row.exerciseId, next)}
            />
          </Fragment>
        ))}
      </div>
    );
  }

  // view mode
  const { viewMembers } = props;
  return (
    <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
      <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">
          Superset
        </span>
      </div>
      {viewMembers.map((m, i) => (
        <Fragment key={m.row.exerciseId}>
          {i > 0 && <div className="h-px bg-foreground/10" />}
          <ExerciseRow mode="view" row={m.row} label={m.label} inSuperset />
        </Fragment>
      ))}
    </div>
  );
}
