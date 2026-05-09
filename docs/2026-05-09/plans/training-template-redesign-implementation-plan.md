# Training Template Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the trainer/owner training template builder, the member + self-tracking logging surfaces, and the read-only template preview to match the density and clarity of the reference fitness-app screenshots — and surface superset creation explicitly.

**Architecture:** Three new shared primitives — `<DayTabs>`, `<ExerciseRow>`, `<SupersetBlock>` — under `src/components/training/`. Each primitive supports `mode='edit' | 'logging' | 'view'`. Phase 1 ships the editor; Phase 2 swaps the logging surfaces to use the same primitives in `'logging'` mode; Phase 3 adds a view page in `'view'` mode. Data model and API endpoints unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript (strict, no `any`/`unknown`), TailwindCSS, shadcn/ui, Jest + React Testing Library.

**Spec:** [`training-template-redesign-design.md`](./training-template-redesign-design.md)

---

## Stage 0 — Prep

### Task 0.1: Confirm baseline is green

**Files:** none

- [ ] **Step 1:** Run baseline tests + lint

```bash
pnpm test --silent 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
```

Expected: tests pass, lint clean. Any pre-existing failures are blockers — investigate before starting.

---

## Stage 1 — Phase 1 Components (Editor primitives)

### Task 1.1: Token-migrate `<ExerciseBadge>`

The existing badge uses hardcoded hex (`bg-[#1e1e1e]`, `text-[#888]`). Migrate it to theme tokens up front so all primitives we build sit on a clean foundation.

**Files:**
- Modify: `src/components/training/exercise-badge.tsx`

- [ ] **Step 1: Update existing test to assert on tokenised classes**

Edit `__tests__/components/training/exercise-badge.test.tsx` — append:

```tsx
  it('uses theme tokens (no hardcoded hex)', () => {
    const { container } = render(<ExerciseBadge label="A" />);
    const span = container.querySelector('span');
    expect(span?.className ?? '').not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
```

- [ ] **Step 2: Run test → expect fail**

```bash
pnpm test -- --testPathPattern=exercise-badge
```
Expected: the new test fails (current classes still contain `[#1e1e1e]`).

- [ ] **Step 3: Migrate hex → tokens**

Replace `src/components/training/exercise-badge.tsx` body with:

```tsx
interface Props {
  label: string;
}

export function ExerciseBadge({ label }: Props) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-muted px-1.5 text-[9px] font-bold tracking-wider text-foreground/80 shrink-0">
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run tests → all pass**

```bash
pnpm test -- --testPathPattern=exercise-badge
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-badge.tsx __tests__/components/training/exercise-badge.test.tsx
git commit -m "refactor(training): migrate ExerciseBadge to theme tokens"
```

---

### Task 1.2: `<DayTabs>` component

**Files:**
- Create: `src/components/training/day-tabs.tsx`
- Test: `__tests__/components/training/day-tabs.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/training/day-tabs.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DayTabs } from '@/components/training/day-tabs';

describe('DayTabs', () => {
  const days = [
    { dayNumber: 1, name: 'Day 1' },
    { dayNumber: 2, name: 'Push Day' },
  ];

  it('renders one tab per day plus an Add Day button when not readOnly', () => {
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} />);
    expect(screen.getByRole('tab', { name: /Day 1/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Push Day/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add day/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<DayTabs days={days} activeIndex={1} onChange={() => {}} onAddDay={() => {}} />);
    expect(screen.getByRole('tab', { name: /Push Day/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Day 1/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with index when a non-active tab is clicked', () => {
    const onChange = jest.fn();
    render(<DayTabs days={days} activeIndex={0} onChange={onChange} onAddDay={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /Push Day/ }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onAddDay when the add button is clicked', () => {
    const onAddDay = jest.fn();
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={onAddDay} />);
    fireEvent.click(screen.getByRole('button', { name: /add day/i }));
    expect(onAddDay).toHaveBeenCalledTimes(1);
  });

  it('hides the Add Day button when readOnly', () => {
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} readOnly />);
    expect(screen.queryByRole('button', { name: /add day/i })).not.toBeInTheDocument();
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} />);
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});
```

- [ ] **Step 2: Run → expect "Cannot find module" failure**

```bash
pnpm test -- --testPathPattern=day-tabs
```

- [ ] **Step 3: Implement**

Create `src/components/training/day-tabs.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DaySummary {
  dayNumber: number;
  name: string;
}

interface Props {
  days: DaySummary[];
  activeIndex: number;
  onChange: (index: number) => void;
  onAddDay: () => void;
  readOnly?: boolean;
}

export function DayTabs({ days, activeIndex, onChange, onAddDay, readOnly = false }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Training days"
      className="sticky top-0 z-10 flex items-center gap-4 overflow-x-auto bg-background/95 backdrop-blur-sm border-b border-foreground/10 px-1 -mx-1"
    >
      {days.map((d, idx) => {
        const active = idx === activeIndex;
        return (
          <button
            key={d.dayNumber}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(idx)}
            className={cn(
              'whitespace-nowrap py-2.5 text-sm transition-colors border-b-2 -mb-px',
              active
                ? 'text-foreground border-foreground font-semibold'
                : 'text-foreground/65 border-transparent hover:text-foreground',
            )}
          >
            Day {d.dayNumber} {d.name && d.name !== `Day ${d.dayNumber}` ? d.name : ''}
          </button>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          aria-label="Add day"
          onClick={onAddDay}
          className="ml-auto inline-flex items-center gap-1 py-2 text-xs text-foreground/65 hover:text-foreground transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add Day
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run → all pass**

```bash
pnpm test -- --testPathPattern=day-tabs
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/day-tabs.tsx __tests__/components/training/day-tabs.test.tsx
git commit -m "feat(training): add DayTabs component"
```

---

### Task 1.3: `<ExerciseRow>` component (edit mode)

**Files:**
- Create: `src/components/training/exercise-row.tsx`
- Test: `__tests__/components/training/exercise-row.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/training/exercise-row.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';

const baseRow: ExerciseRowData = {
  exerciseId: 'ex1',
  exerciseName: 'Squat',
  imageUrl: null,
  isBodyweight: false,
  groupId: 'ex1',
  isSuperset: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 120,
};

describe('ExerciseRow (edit mode)', () => {
  it('renders label, name, and all numeric inputs with current values', () => {
    render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByLabelText(/sets/i)).toHaveValue('3');
    expect(screen.getByLabelText(/reps min/i)).toHaveValue('8');
    expect(screen.getByLabelText(/reps max/i)).toHaveValue('12');
    expect(screen.getByLabelText(/rest/i)).toHaveValue('120');
  });

  it('numeric inputs use inputMode="decimal" not type="number"', () => {
    render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    const sets = screen.getByLabelText(/sets/i);
    expect(sets).toHaveAttribute('inputMode', 'decimal');
    expect(sets).not.toHaveAttribute('type', 'number');
  });

  it('disables move-up at first position and move-down at last position', () => {
    const { rerender } = render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="first"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /move up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move down/i })).toBeEnabled();
    rerender(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="last"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /move up/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /move down/i })).toBeDisabled();
  });

  it('fires onChange("sets", 5) when sets input changes', () => {
    const onChange = jest.fn();
    render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={onChange}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/sets/i), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('sets', 5);
  });

  it('fires onChange("isBodyweight", true) when BW is toggled', () => {
    const onChange = jest.fn();
    render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={onChange}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText(/^bw$/i));
    expect(onChange).toHaveBeenCalledWith('isBodyweight', true);
  });

  it('fires onDelete when × clicked', () => {
    const onDelete = jest.fn();
    render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /remove exercise/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows validation ring when hasError is true', () => {
    const { container } = render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
        hasError
      />,
    );
    expect(container.querySelector('[data-testid="exercise-row"]')?.className ?? '')
      .toMatch(/ring-destructive/);
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = render(
      <ExerciseRow
        mode="edit"
        row={baseRow}
        label="A"
        position="only"
        onChange={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});
```

- [ ] **Step 2: Run → expect import failure**

```bash
pnpm test -- --testPathPattern=exercise-row
```

- [ ] **Step 3: Implement**

Create `src/components/training/exercise-row.tsx`:

```tsx
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
      <label htmlFor={id} className="text-[10px] uppercase tracking-wider text-foreground/65 mb-0.5">
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
          <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{row.exerciseName}</span>

          <div className="flex items-center gap-1 ml-auto sm:ml-0 order-3 sm:order-none shrink-0">
            <button
              type="button"
              aria-label="Move up"
              disabled={moveUpDisabled}
              onClick={onMoveUp}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-foreground rounded-md disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={moveDownDisabled}
              onClick={onMoveDown}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-foreground rounded-md disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remove exercise"
              onClick={onDelete}
              className="size-7 inline-flex items-center justify-center text-foreground/65 hover:text-destructive rounded-md"
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

  // logging + view modes are stubs in P1; full implementation in P2/P3.
  return null;
}
```

- [ ] **Step 4: Run → all pass**

```bash
pnpm test -- --testPathPattern=exercise-row
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-row.tsx __tests__/components/training/exercise-row.test.tsx
git commit -m "feat(training): add ExerciseRow component (edit mode)"
```

---

### Task 1.4: `<SupersetBlock>` component

**Files:**
- Create: `src/components/training/superset-block.tsx`
- Test: `__tests__/components/training/superset-block.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/training/superset-block.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SupersetBlock } from '@/components/training/superset-block';
import type { ExerciseRowData } from '@/components/training/exercise-row';

const exA: ExerciseRowData = {
  exerciseId: 'a', exerciseName: 'Lat Pulldown', imageUrl: null, isBodyweight: false,
  groupId: 'g1', isSuperset: true, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60,
};
const exB: ExerciseRowData = { ...exA, exerciseId: 'b', exerciseName: 'Cable Row' };

describe('SupersetBlock (edit mode)', () => {
  function renderBlock(overrides: Partial<Parameters<typeof SupersetBlock>[0]> = {}) {
    return render(
      <SupersetBlock
        mode="edit"
        groupId="g1"
        members={[
          { row: exA, label: 'B1' },
          { row: exB, label: 'B2' },
        ]}
        onChangeRow={() => {}}
        onMoveRow={() => {}}
        onDeleteRow={() => {}}
        onAddToSuperset={() => {}}
        onUngroup={() => {}}
        onDeleteSuperset={() => {}}
        {...overrides}
      />,
    );
  }

  it('renders the Superset header with Ungroup and Delete superset buttons', () => {
    renderBlock();
    expect(screen.getByText(/superset/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ungroup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete superset/i })).toBeInTheDocument();
  });

  it('renders one ExerciseRow per member', () => {
    renderBlock();
    expect(screen.getByText('Lat Pulldown')).toBeInTheDocument();
    expect(screen.getByText('Cable Row')).toBeInTheDocument();
  });

  it('renders an Add to Superset entry', () => {
    renderBlock();
    expect(screen.getByRole('button', { name: /add to superset/i })).toBeInTheDocument();
  });

  it('calls onAddToSuperset when entry clicked', () => {
    const fn = jest.fn();
    renderBlock({ onAddToSuperset: fn });
    fireEvent.click(screen.getByRole('button', { name: /add to superset/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onUngroup when Ungroup clicked', () => {
    const fn = jest.fn();
    renderBlock({ onUngroup: fn });
    fireEvent.click(screen.getByRole('button', { name: /ungroup/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('opens confirm dialog when Delete superset clicked, calls onDeleteSuperset on confirm', () => {
    const fn = jest.fn();
    renderBlock({ onDeleteSuperset: fn });
    fireEvent.click(screen.getByRole('button', { name: /delete superset/i }));
    // Confirm dialog appears
    expect(screen.getByText(/delete this superset/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('disables internal move-up at first member and move-down at last member', () => {
    renderBlock();
    const moveUps = screen.getAllByRole('button', { name: /move up/i });
    const moveDowns = screen.getAllByRole('button', { name: /move down/i });
    expect(moveUps[0]).toBeDisabled();
    expect(moveUps[1]).toBeEnabled();
    expect(moveDowns[0]).toBeEnabled();
    expect(moveDowns[1]).toBeDisabled();
  });

  it('renders empty body but still allows Add to Superset when members is empty', () => {
    renderBlock({ members: [] });
    expect(screen.getByRole('button', { name: /add to superset/i })).toBeInTheDocument();
    expect(screen.queryByText('Lat Pulldown')).not.toBeInTheDocument();
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = renderBlock();
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});
```

- [ ] **Step 2: Run → expect failure**

```bash
pnpm test -- --testPathPattern=superset-block
```

- [ ] **Step 3: Implement**

Create `src/components/training/superset-block.tsx`:

```tsx
'use client';

import { Fragment, useState } from 'react';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface SupersetMember {
  row: ExerciseRowData;
  label: string;
}

interface BaseProps {
  groupId: string;
  members: SupersetMember[];
}

interface EditProps extends BaseProps {
  mode: 'edit';
  onChangeRow: (rowExerciseId: string, field: keyof ExerciseRowData, value: ExerciseRowData[keyof ExerciseRowData]) => void;
  onMoveRow: (rowExerciseId: string, dir: 'up' | 'down') => void;
  onDeleteRow: (rowExerciseId: string) => void;
  onAddToSuperset: () => void;
  onUngroup: () => void;
  onDeleteSuperset: () => void;
  errorRowIds?: Set<string>;
}

interface LoggingProps extends BaseProps {
  mode: 'logging';
}

interface ViewProps extends BaseProps {
  mode: 'view';
}

type Props = EditProps | LoggingProps | ViewProps;

export function SupersetBlock(props: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { members, mode } = props;

  if (mode === 'edit') {
    const { onChangeRow, onMoveRow, onDeleteRow, onAddToSuperset, onUngroup, onDeleteSuperset, errorRowIds } = props;

    return (
      <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
        <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">Superset</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onUngroup}
              className="text-xs text-foreground/65 hover:text-foreground transition-colors"
            >
              Ungroup
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-foreground/65 hover:text-destructive transition-colors"
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
          className="block w-full px-3 py-2 border-t border-foreground/10 text-xs text-foreground/65 hover:text-foreground transition-colors"
        >
          + Add to Superset
        </button>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this superset?</DialogTitle>
              <DialogDescription>
                All {members.length} exercise{members.length === 1 ? '' : 's'} in this superset will be removed from the day.
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

  // logging + view modes are stubs in P1; full implementation in P2/P3.
  return null;
}
```

- [ ] **Step 4: Run → all pass**

```bash
pnpm test -- --testPathPattern=superset-block
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/superset-block.tsx __tests__/components/training/superset-block.test.tsx
git commit -m "feat(training): add SupersetBlock component (edit mode)"
```

---

## Stage 2 — Phase 1 Form Integration

### Task 2.1: Rewrite `plan-template-form.tsx` to use new primitives

**Files:**
- Modify (full rewrite): `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx`

- [ ] **Step 1: Read existing file fully into mental context**

Already in context above (read at conversation start).

- [ ] **Step 2: Replace the file**

Overwrite `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx` with:

```tsx
'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DayTabs } from '@/components/training/day-tabs';
import { ExerciseRow, type ExerciseRowData } from '@/components/training/exercise-row';
import { SupersetBlock } from '@/components/training/superset-block';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import type { IPlanDayExercise, IPlanDay } from '@/lib/db/models/plan-template.model';
import type mongoose from 'mongoose';

interface DayState {
  dayNumber: number;
  name: string;
  exercises: ExerciseRowData[];
}

interface FormPayload {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: { name: string; description: string | null; days: IPlanDay[] };
  exercises?: ExerciseOption[];
  onSubmit: (data: FormPayload) => Promise<void>;
  onCancel?: () => void;
}

type SheetTarget =
  | { kind: 'day'; dayIdx: number }
  | { kind: 'superset'; dayIdx: number; groupId: string }
  | null;

function rowToIPlanDayExercise(row: ExerciseRowData): IPlanDayExercise {
  return {
    groupId: row.groupId,
    isSuperset: row.isSuperset,
    exerciseId: row.exerciseId as unknown as mongoose.Types.ObjectId,
    exerciseName: row.exerciseName,
    imageUrl: row.imageUrl,
    isBodyweight: row.isBodyweight,
    sets: row.sets,
    repsMin: row.repsMin,
    repsMax: row.repsMax,
    restSeconds: row.restSeconds,
  };
}

function toDayState(day: IPlanDay): DayState {
  return {
    dayNumber: day.dayNumber,
    name: day.name,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      exerciseId: ex.exerciseId.toString(),
    })),
  };
}

export function PlanTemplateForm({
  initialData,
  exercises: initialExercises = [],
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<DayState[]>(initialData?.days.map(toDayState) ?? []);
  const [activeDay, setActiveDay] = useState(0);
  const [pendingEmptyGroups, setPendingEmptyGroups] = useState<Map<number, string[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(initialExercises);
  const [degradeDialog, setDegradeDialog] = useState<{ count: number } | null>(null);
  const [errorRowIds, setErrorRowIds] = useState<Set<string>>(new Set());
  const [discardDialog, setDiscardDialog] = useState(false);

  const isEditMode = Boolean(initialData);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        days: initialData?.days ?? [],
      }),
    [initialData],
  );
  const isDirty = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map(rowToIPlanDayExercise),
        })),
      }) !== initialSnapshot,
    [name, description, days, initialSnapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  function addDay() {
    const num = days.length + 1;
    setDays((prev) => [...prev, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
    setActiveDay(days.length);
  }

  function removeDay(dayIdx: number) {
    setDays((prev) =>
      prev
        .filter((_, i) => i !== dayIdx)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      next.delete(dayIdx);
      return next;
    });
    setActiveDay((prev) => Math.min(prev, Math.max(0, days.length - 2)));
  }

  function updateDayName(dayIdx: number, value: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)));
  }

  function findExerciseIndex(dayIdx: number, exerciseId: string): number {
    return days[dayIdx]?.exercises.findIndex((ex) => ex.exerciseId === exerciseId) ?? -1;
  }

  function updateExerciseField(
    dayIdx: number,
    exerciseId: string,
    field: keyof ExerciseRowData,
    value: ExerciseRowData[keyof ExerciseRowData],
  ) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.exerciseId === exerciseId ? { ...ex, [field]: value } : ex,
          ),
        };
      }),
    );
  }

  function deleteExercise(dayIdx: number, exerciseId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, exercises: d.exercises.filter((ex) => ex.exerciseId !== exerciseId) };
      }),
    );
  }

  function moveStandalone(dayIdx: number, exerciseId: string, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const idx = exs.findIndex((ex) => ex.exerciseId === exerciseId);
        if (idx < 0 || exs[idx].isSuperset) return d;
        // find the next standalone in the chosen direction (skipping over
        // contiguous superset members which travel as a single hop)
        let target = -1;
        if (dir === 'up') {
          for (let j = idx - 1; j >= 0; j--) {
            if (!exs[j].isSuperset) { target = j; break; }
            if (j === 0 || exs[j - 1].groupId !== exs[j].groupId) {
              target = j;
              break;
            }
          }
        } else {
          for (let j = idx + 1; j < exs.length; j++) {
            if (!exs[j].isSuperset) { target = j; break; }
            if (j === exs.length - 1 || exs[j + 1].groupId !== exs[j].groupId) {
              target = j;
              break;
            }
          }
        }
        if (target < 0) return d;
        // Find the contiguous slice [start..end] at target if it's a superset
        let start = target;
        let end = target;
        if (exs[target].isSuperset) {
          const gid = exs[target].groupId;
          while (start > 0 && exs[start - 1].isSuperset && exs[start - 1].groupId === gid) start--;
          while (end < exs.length - 1 && exs[end + 1].isSuperset && exs[end + 1].groupId === gid) end++;
        }
        const moved = [exs[idx]];
        const block = exs.slice(start, end + 1);
        const next = [...exs];
        if (dir === 'up') {
          next.splice(idx, 1);
          next.splice(start, 0, ...moved);
          // block shifts down by 1
          // Already consistent since we removed at idx (>start) and inserted at start
        } else {
          next.splice(idx, 1);
          // After removal, target indices shift. block now occupies [start-1..end-1]; insert moved after end-1.
          next.splice(end, 0, ...moved);
        }
        // Validate: ensure no superset block was split
        for (let j = 1; j < next.length; j++) {
          if (next[j].isSuperset && next[j - 1].isSuperset && next[j - 1].groupId !== next[j].groupId) {
            // Different superset groups touching — fine.
          }
          if (next[j].isSuperset) {
            const gid = next[j].groupId;
            const groupIndices = next.map((e, k) => (e.isSuperset && e.groupId === gid ? k : -1)).filter((k) => k >= 0);
            const isContiguous = groupIndices.every((k, m) => m === 0 || k === groupIndices[m - 1] + 1);
            if (!isContiguous) return d; // refuse the move; preserves contiguity invariant
          }
        }
        // Suppress unused
        void block;
        return { ...d, exercises: next };
      }),
    );
  }

  function moveSupersetMember(dayIdx: number, exerciseId: string, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const idx = exs.findIndex((ex) => ex.exerciseId === exerciseId);
        if (idx < 0 || !exs[idx].isSuperset) return d;
        const gid = exs[idx].groupId;
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= exs.length) return d;
        if (!exs[target].isSuperset || exs[target].groupId !== gid) return d;
        [exs[idx], exs[target]] = [exs[target], exs[idx]];
        return { ...d, exercises: exs };
      }),
    );
  }

  function addExerciseStandalone(dayIdx: number, exercise: ExerciseOption) {
    const newRow: ExerciseRowData = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      imageUrl: exercise.imageUrl,
      isBodyweight: exercise.isBodyweight,
      groupId: exercise._id,
      isSuperset: false,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
    };
    setDays((prev) =>
      prev.map((d, i) => (i === dayIdx ? { ...d, exercises: [...d.exercises, newRow] } : d)),
    );
  }

  function startEmptySuperset(dayIdx: number) {
    const groupId = crypto.randomUUID();
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = [...(next.get(dayIdx) ?? []), groupId];
      next.set(dayIdx, arr);
      return next;
    });
  }

  function addExerciseToSuperset(dayIdx: number, groupId: string, exercise: ExerciseOption) {
    const newRow: ExerciseRowData = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      imageUrl: exercise.imageUrl,
      isBodyweight: exercise.isBodyweight,
      groupId,
      isSuperset: true,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
    };
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const lastIdx = exs.map((e, k) => (e.isSuperset && e.groupId === groupId ? k : -1)).filter((k) => k >= 0).pop();
        if (typeof lastIdx === 'number') {
          exs.splice(lastIdx + 1, 0, newRow);
        } else {
          exs.push(newRow);
        }
        return { ...d, exercises: exs };
      }),
    );
    // Once the group has at least one row, it's no longer "pending empty"
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function ungroupSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.isSuperset && ex.groupId === groupId
              ? { ...ex, isSuperset: false, groupId: ex.exerciseId }
              : ex,
          ),
        };
      }),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function deleteSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          exercises: d.exercises.filter((ex) => !(ex.isSuperset && ex.groupId === groupId)),
        };
      }),
    );
    setPendingEmptyGroups((prev) => {
      const next = new Map(prev);
      const arr = (next.get(dayIdx) ?? []).filter((g) => g !== groupId);
      if (arr.length === 0) next.delete(dayIdx);
      else next.set(dayIdx, arr);
      return next;
    });
  }

  function validate(daysToCheck: DayState[]): { firstError: string | null; rowIds: Set<string> } {
    const rowIds = new Set<string>();
    let firstError: string | null = null;
    if (!name.trim()) firstError = 'Plan name is required';
    if (daysToCheck.length === 0 && !firstError) firstError = 'Add at least one day';
    daysToCheck.forEach((d, idx) => {
      if (!d.name.trim() && !firstError) firstError = `Day ${idx + 1} needs a name`;
      if (d.exercises.length === 0 && !firstError) firstError = `Day "${d.name || idx + 1}" needs at least one exercise`;
      d.exercises.forEach((ex) => {
        const bad =
          !Number.isInteger(ex.sets) || ex.sets < 1 ||
          !Number.isInteger(ex.repsMin) || ex.repsMin < 1 ||
          !Number.isInteger(ex.repsMax) || ex.repsMax < ex.repsMin ||
          (ex.restSeconds !== null && (!Number.isInteger(ex.restSeconds) || ex.restSeconds < 0));
        if (bad) {
          rowIds.add(ex.exerciseId);
          if (!firstError) firstError = `Check sets/reps/rest on "${ex.exerciseName}"`;
        }
      });
    });
    return { firstError, rowIds };
  }

  function findSingleSupersetGroups(daysToCheck: DayState[]): { dayIdx: number; groupId: string; row: ExerciseRowData }[] {
    const out: { dayIdx: number; groupId: string; row: ExerciseRowData }[] = [];
    daysToCheck.forEach((d, dayIdx) => {
      const counts = new Map<string, ExerciseRowData[]>();
      d.exercises.filter((e) => e.isSuperset).forEach((e) => {
        counts.set(e.groupId, [...(counts.get(e.groupId) ?? []), e]);
      });
      counts.forEach((rows, groupId) => {
        if (rows.length === 1) out.push({ dayIdx, groupId, row: rows[0] });
      });
    });
    return out;
  }

  async function actuallySubmit(daysFinal: DayState[]) {
    setSaving(true);
    try {
      const payload: FormPayload = {
        name: name.trim(),
        description: description.trim() || null,
        days: daysFinal.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name.trim(),
          exercises: d.exercises.map(rowToIPlanDayExercise),
        })),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorRowIds(new Set());

    const v = validate(days);
    if (v.firstError) {
      setErrorRowIds(v.rowIds);
      toast.error(v.firstError);
      return;
    }

    const singles = findSingleSupersetGroups(days);
    if (singles.length > 0) {
      setDegradeDialog({ count: singles.length });
      return;
    }

    await actuallySubmit(days);
  }

  async function continueDegrade() {
    if (!degradeDialog) return;
    const singles = findSingleSupersetGroups(days);
    const singleIds = new Set(singles.map((s) => s.row.exerciseId));
    const daysFinal = days.map((d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        singleIds.has(ex.exerciseId)
          ? { ...ex, isSuperset: false, groupId: ex.exerciseId }
          : ex,
      ),
    }));
    setDegradeDialog(null);
    await actuallySubmit(daysFinal);
  }

  function handleCancel() {
    if (isDirty) {
      setDiscardDialog(true);
      return;
    }
    onCancel?.();
  }

  // ---------- render helpers ----------

  function renderDay(day: DayState, dayIdx: number) {
    const labelled = labelExercises(day.exercises);
    const emptyGroupIds = pendingEmptyGroups.get(dayIdx) ?? [];

    type StandaloneSlot = { kind: 'standalone'; exercise: typeof labelled[number]; index: number };
    type SupersetSlot = { kind: 'superset'; groupId: string; members: { row: ExerciseRowData; label: string }[] };
    type EmptySlot = { kind: 'empty-superset'; groupId: string };
    type Slot = StandaloneSlot | SupersetSlot | EmptySlot;

    const slots: Slot[] = [];
    const seenGroups = new Set<string>();
    labelled.forEach((ex, i) => {
      if (!ex.isSuperset) {
        slots.push({ kind: 'standalone', exercise: ex, index: i });
      } else if (!seenGroups.has(ex.groupId)) {
        seenGroups.add(ex.groupId);
        const members = labelled
          .filter((e) => e.isSuperset && e.groupId === ex.groupId)
          .map((e) => ({ row: e as ExerciseRowData, label: e.label }));
        slots.push({ kind: 'superset', groupId: ex.groupId, members });
      }
    });
    emptyGroupIds.forEach((gid) => slots.push({ kind: 'empty-superset', groupId: gid }));

    const standaloneIndices = slots
      .map((s, i) => (s.kind === 'standalone' ? i : -1))
      .filter((i) => i >= 0);

    return (
      <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 space-y-3 border-0 shadow-none">
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Day ${dayIdx + 1}`}
            value={day.name}
            onChange={(e) => updateDayName(dayIdx, e.target.value)}
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

        <div className="space-y-2">
          {slots.map((slot, slotPos) => {
            if (slot.kind === 'standalone') {
              const isFirstStandalone = standaloneIndices[0] === slotPos;
              const isLastStandalone = standaloneIndices[standaloneIndices.length - 1] === slotPos;
              const onlyStandalone = standaloneIndices.length === 1;
              const position: 'first' | 'middle' | 'last' | 'only' = onlyStandalone
                ? 'only'
                : isFirstStandalone
                  ? 'first'
                  : isLastStandalone
                    ? 'last'
                    : 'middle';
              return (
                <ExerciseRow
                  key={slot.exercise.exerciseId}
                  mode="edit"
                  row={slot.exercise as ExerciseRowData}
                  label={slot.exercise.label}
                  position={position}
                  onChange={(field, value) => updateExerciseField(dayIdx, slot.exercise.exerciseId, field, value)}
                  onMoveUp={() => moveStandalone(dayIdx, slot.exercise.exerciseId, 'up')}
                  onMoveDown={() => moveStandalone(dayIdx, slot.exercise.exerciseId, 'down')}
                  onDelete={() => deleteExercise(dayIdx, slot.exercise.exerciseId)}
                  hasError={errorRowIds.has(slot.exercise.exerciseId)}
                />
              );
            }
            if (slot.kind === 'superset') {
              return (
                <SupersetBlock
                  key={slot.groupId}
                  mode="edit"
                  groupId={slot.groupId}
                  members={slot.members}
                  onChangeRow={(rowExId, field, value) => updateExerciseField(dayIdx, rowExId, field, value)}
                  onMoveRow={(rowExId, dir) => moveSupersetMember(dayIdx, rowExId, dir)}
                  onDeleteRow={(rowExId) => deleteExercise(dayIdx, rowExId)}
                  onAddToSuperset={() => setSheetTarget({ kind: 'superset', dayIdx, groupId: slot.groupId })}
                  onUngroup={() => ungroupSuperset(dayIdx, slot.groupId)}
                  onDeleteSuperset={() => deleteSuperset(dayIdx, slot.groupId)}
                  errorRowIds={errorRowIds}
                />
              );
            }
            // empty superset placeholder
            return (
              <SupersetBlock
                key={slot.groupId}
                mode="edit"
                groupId={slot.groupId}
                members={[]}
                onChangeRow={() => {}}
                onMoveRow={() => {}}
                onDeleteRow={() => {}}
                onAddToSuperset={() => setSheetTarget({ kind: 'superset', dayIdx, groupId: slot.groupId })}
                onUngroup={() => ungroupSuperset(dayIdx, slot.groupId)}
                onDeleteSuperset={() => deleteSuperset(dayIdx, slot.groupId)}
              />
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setSheetTarget({ kind: 'day', dayIdx })}
            className="flex-1 rounded-lg border border-dashed border-foreground/15 py-2.5 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors"
          >
            + Add Exercise
          </button>
          <button
            type="button"
            onClick={() => startEmptySuperset(dayIdx)}
            className="flex-1 rounded-lg border border-dashed border-foreground/15 py-2.5 text-xs text-foreground/65 hover:border-foreground/40 hover:text-foreground transition-colors"
          >
            + Add Superset
          </button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 max-w-3xl mx-auto">
      <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-6 space-y-5 border-0 shadow-none">
        <div className="space-y-1.5">
          <label htmlFor="plan-name" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Plan Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="plan-desc" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Description
          </label>
          <Textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </Card>

      {days.length > 0 && (
        <DayTabs
          days={days.map((d) => ({ dayNumber: d.dayNumber, name: d.name }))}
          activeIndex={activeDay}
          onChange={setActiveDay}
          onAddDay={addDay}
        />
      )}

      {days.length === 0 ? (
        <Card className="bg-card ring-1 ring-foreground/10 rounded-xl p-8 text-center space-y-3 border-0 shadow-none">
          <p className="text-sm text-foreground/65">No training days yet.</p>
          <Button type="button" variant="outline" onClick={addDay}>
            + Add your first day
          </Button>
        </Card>
      ) : (
        <Fragment>{days[activeDay] && renderDay(days[activeDay], activeDay)}</Fragment>
      )}

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-foreground/10 flex flex-col gap-2 z-10">
        <Button type="submit" className="w-full" disabled={saving || (isEditMode && !isDirty)}>
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="w-full"
          >
            Cancel
          </Button>
        )}
      </div>

      {sheetTarget !== null && (
        <ExerciseSearchSheet
          open
          onOpenChange={(open) => {
            if (!open) setSheetTarget(null);
          }}
          exercises={availableExercises}
          onSelect={(ex) => {
            if (sheetTarget.kind === 'day') addExerciseStandalone(sheetTarget.dayIdx, ex);
            else addExerciseToSuperset(sheetTarget.dayIdx, sheetTarget.groupId, ex);
            setSheetTarget(null);
          }}
          onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
        />
      )}

      <Dialog open={degradeDialog !== null} onOpenChange={(open) => !open && setDegradeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Single-exercise supersets detected</DialogTitle>
            <DialogDescription>
              {degradeDialog?.count ?? 0} superset
              {(degradeDialog?.count ?? 0) === 1 ? '' : 's'} contain only one exercise.
              On save, they will be converted to standalone exercises. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDegradeDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void continueDegrade()} disabled={saving}>
              {saving ? 'Saving…' : 'Continue & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardDialog} onOpenChange={setDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>You have unsaved edits. Leaving will discard them.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscardDialog(false);
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
```

- [ ] **Step 3: Run all training tests + form-related tests**

```bash
pnpm test -- --testPathPattern="(training|plan-template)"
```

Expected: previously written component tests still pass; any pre-existing form tests may break — fix in next task.

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Expected: zero warnings/errors. Fix any introduced.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/plans/_components/plan-template-form.tsx
git commit -m "feat(training): rewrite plan template form with new primitives"
```

---

### Task 2.2: Form integration tests

**Files:**
- Create: `__tests__/app/dashboard/trainer/plans/plan-template-form.test.tsx`

- [ ] **Step 1: Write failing tests**

Create the file:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanTemplateForm } from '@/app/(dashboard)/trainer/plans/_components/plan-template-form';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
import { toast } from 'sonner';

const mockExercises = [
  { _id: 'ex-squat', name: 'Squat', imageUrl: null, isBodyweight: false } as never,
  { _id: 'ex-bench', name: 'Bench Press', imageUrl: null, isBodyweight: false } as never,
];

describe('PlanTemplateForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks submit when no days', async () => {
    const onSubmit = jest.fn();
    render(<PlanTemplateForm onSubmit={onSubmit} exercises={mockExercises} />);
    fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: 'My Plan' } });
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Add at least one day'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit when a day has no exercises', async () => {
    const onSubmit = jest.fn();
    render(<PlanTemplateForm onSubmit={onSubmit} exercises={mockExercises} />);
    fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: 'P' } });
    fireEvent.click(screen.getByRole('button', { name: /add your first day/i }));
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('opens degrade dialog for a single-member superset and degrades on Continue', async () => {
    const onSubmit = jest.fn();
    render(
      <PlanTemplateForm
        onSubmit={onSubmit}
        exercises={mockExercises}
        initialData={{
          name: 'Test',
          description: null,
          days: [
            {
              dayNumber: 1,
              name: 'Day 1',
              exercises: [
                {
                  exerciseId: 'ex-squat' as never,
                  exerciseName: 'Squat',
                  imageUrl: null,
                  isBodyweight: false,
                  groupId: 'g-only-one',
                  isSuperset: true,
                  sets: 3,
                  repsMin: 8,
                  repsMax: 12,
                  restSeconds: 60,
                },
              ],
            },
          ],
        }}
      />,
    );
    // Trigger dirtyness so the Save button enables
    fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: 'Test 2' } });
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() =>
      expect(screen.getByText(/single-exercise supersets detected/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /continue & save/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const arg = onSubmit.mock.calls[0][0] as { days: { exercises: { isSuperset: boolean; groupId: string; exerciseId: unknown }[] }[] };
    const ex = arg.days[0].exercises[0];
    expect(ex.isSuperset).toBe(false);
    expect(String(ex.groupId)).toBe('ex-squat');
  });

  it('shows discard dialog when Cancel pressed with dirty form', () => {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    render(
      <PlanTemplateForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        exercises={mockExercises}
        initialData={{ name: 'X', description: null, days: [] }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → some pass / some fail**

```bash
pnpm test -- --testPathPattern=plan-template-form
```

If any fail due to test setup mismatches, adjust the test (not the component) until green.

- [ ] **Step 3: Commit**

```bash
git add __tests__/app/dashboard/trainer/plans/plan-template-form.test.tsx
git commit -m "test(training): add plan-template-form integration tests"
```

---

### Task 2.3: Delete obsolete tests, verify suite + build

**Files:**
- Delete (if exists with stale assertions): any older `plan-template-form.test.tsx` or fragments asserting on old hex classes. Inspect first.

- [ ] **Step 1: Locate any pre-existing form tests**

```bash
grep -r "plan-template-form\|PlanTemplateForm" __tests__/ 2>/dev/null
```

- [ ] **Step 2: Update or delete any test that asserts on `[#xxx]` hex classes or removed DOM (Group as Superset button)**

If found, prefer updating to assert on new contract; only delete if fundamentally obsolete.

- [ ] **Step 3: Full test run**

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 4: Lint + build**

```bash
pnpm lint && pnpm build
```

Expected: zero warnings; build succeeds.

- [ ] **Step 5: Hex audit on touched files**

```bash
grep -E "(bg|text|border|ring)-\[#" \
  src/components/training/day-tabs.tsx \
  src/components/training/exercise-row.tsx \
  src/components/training/superset-block.tsx \
  src/components/training/exercise-badge.tsx \
  src/app/\(dashboard\)/trainer/plans/_components/plan-template-form.tsx
```

Expected: no matches.

- [ ] **Step 6: Commit any fixups + finalize Phase 1**

```bash
git status
# if changes:
git add -A
git commit -m "chore(training): finalize phase 1 hex audit + test fixups"
```

---

## Stage 3 — Phase 2: Logging surfaces

### Task 3.1: Extend `<ExerciseRow>` with `mode="logging"`

**Files:**
- Modify: `src/components/training/exercise-row.tsx`
- Modify: `__tests__/components/training/exercise-row.test.tsx`

- [ ] **Step 1: Write failing tests for logging mode**

Append to `__tests__/components/training/exercise-row.test.tsx`:

```tsx
describe('ExerciseRow (logging mode)', () => {
  const baseLogRow = {
    exerciseId: 'ex1',
    exerciseName: 'Squat',
    imageUrl: null,
    isBodyweight: false,
    groupId: 'ex1',
    isSuperset: false,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 120,
  };

  const sets = [
    { setNumber: 1, prescribedRepsMin: 8, prescribedRepsMax: 12, actualWeight: null, actualReps: null, completedAt: null, globalIndex: 0 },
    { setNumber: 2, prescribedRepsMin: 8, prescribedRepsMax: 12, actualWeight: 60, actualReps: 10, completedAt: '2026-05-09T10:00:00Z', globalIndex: 1 },
  ];

  it('renders Sets and Reps as summary pills (no inputs in header)', () => {
    render(
      <ExerciseRow
        mode="logging"
        row={baseLogRow}
        label="A"
        loggingSets={sets}
        inputs={[{ weight: '', reps: '' }, { weight: '', reps: '' }]}
        onInputChange={() => {}}
        onLogSet={() => {}}
        onAddSet={() => {}}
        onBwToggle={() => {}}
      />,
    );
    expect(screen.getByText(/sets:\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/reps:\s*8\s*–\s*12/i)).toBeInTheDocument();
  });

  it('renders one row per set with weight + reps inputs and a check button when not done', () => {
    render(
      <ExerciseRow
        mode="logging"
        row={baseLogRow}
        label="A"
        loggingSets={[sets[0]]}
        inputs={[{ weight: '', reps: '' }]}
        onInputChange={() => {}}
        onLogSet={() => {}}
        onAddSet={() => {}}
        onBwToggle={() => {}}
      />,
    );
    expect(screen.getByLabelText(/set 1 weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/set 1 reps/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete set 1/i })).toBeInTheDocument();
  });

  it('renders done state with completed values and no inputs', () => {
    render(
      <ExerciseRow
        mode="logging"
        row={baseLogRow}
        label="A"
        loggingSets={[sets[1]]}
        inputs={[{ weight: '', reps: '' }]}
        onInputChange={() => {}}
        onLogSet={() => {}}
        onAddSet={() => {}}
        onBwToggle={() => {}}
      />,
    );
    expect(screen.getByText(/60 kg/)).toBeInTheDocument();
    expect(screen.getByText(/10 reps/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/set 2 weight/i)).not.toBeInTheDocument();
  });

  it('hides weight input when isBodyweight is true', () => {
    render(
      <ExerciseRow
        mode="logging"
        row={{ ...baseLogRow, isBodyweight: true }}
        label="A"
        loggingSets={[sets[0]]}
        inputs={[{ weight: '', reps: '' }]}
        onInputChange={() => {}}
        onLogSet={() => {}}
        onAddSet={() => {}}
        onBwToggle={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/set 1 weight/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/set 1 reps/i)).toBeInTheDocument();
  });

  it('calls onAddSet when + Add Set clicked', () => {
    const onAddSet = jest.fn();
    render(
      <ExerciseRow
        mode="logging"
        row={baseLogRow}
        label="A"
        loggingSets={sets}
        inputs={[{ weight: '', reps: '' }, { weight: '', reps: '' }]}
        onInputChange={() => {}}
        onLogSet={() => {}}
        onAddSet={onAddSet}
        onBwToggle={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /add set/i }));
    expect(onAddSet).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run → expect failures**

```bash
pnpm test -- --testPathPattern=exercise-row
```

- [ ] **Step 3: Implement logging mode**

In `src/components/training/exercise-row.tsx`, replace the `LoggingProps` interface and add the logging-mode render.

Replace the `LoggingProps` block:

```tsx
export interface LoggingSetInput {
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
  globalIndex: number;
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
```

Replace the `// logging + view modes are stubs` block with:

```tsx
  if (mode === 'logging') {
    const { loggingSets, inputs, onInputChange, onLogSet, onAddSet, onBwToggle, bwOverride } = props;
    const isBw = bwOverride ?? row.isBodyweight;
    const completedCount = loggingSets.length;
    const repsLabel = row.repsMin === row.repsMax ? `${row.repsMin}` : `${row.repsMin}–${row.repsMax}`;

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
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                Reps: {repsLabel}
              </span>
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
              <div key={s.globalIndex} className={`flex items-center gap-2 ${done ? 'opacity-60' : ''}`}>
                <span className="text-[11px] text-foreground/65 w-5 shrink-0 font-mono">
                  {String(s.setNumber).padStart(2, '0')}
                </span>
                {done ? (
                  <>
                    <span className="flex-1 text-xs text-foreground/65">
                      {!isBw && s.actualWeight !== null ? `${s.actualWeight} kg × ` : ''}
                      {s.actualReps !== null ? `${s.actualReps} reps` : '–'}
                    </span>
                    <span className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md bg-foreground/10 text-foreground text-[10px]">✓</span>
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
                      <span className="h-7 w-16 shrink-0 inline-flex items-center justify-center rounded-md ring-1 ring-foreground/10 text-[10px] text-foreground/50">BW</span>
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
                      className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md ring-1 ring-foreground/25 text-foreground/65 hover:text-foreground hover:ring-foreground"
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
          className="mt-2 text-xs text-foreground/65 hover:text-foreground transition-colors"
        >
          + Add Set
        </button>
      </div>
    );
  }

  // view mode stub for P1; implemented in P3.
  return null;
```

- [ ] **Step 4: Run tests → all pass**

```bash
pnpm test -- --testPathPattern=exercise-row
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-row.tsx __tests__/components/training/exercise-row.test.tsx
git commit -m "feat(training): add logging mode to ExerciseRow"
```

---

### Task 3.2: Extend `<SupersetBlock>` with `mode="logging"`

**Files:**
- Modify: `src/components/training/superset-block.tsx`

- [ ] **Step 1: Add types and rendering for logging mode**

Replace the `LoggingProps` interface to include logging callbacks:

```tsx
import type { LoggingSetInput } from '@/components/training/exercise-row';

export interface SupersetLoggingMember {
  row: ExerciseRowData;
  label: string;
  loggingSets: LoggingSetInput[];
  inputs: { weight: string; reps: string }[];
  bwOverride?: boolean;
}

interface LoggingProps extends BaseProps {
  mode: 'logging';
  loggingMembers: SupersetLoggingMember[];
  onInputChange: (memberExerciseId: string, globalIndex: number, field: 'weight' | 'reps', value: string) => void;
  onLogSet: (memberExerciseId: string, globalIndex: number) => void;
  onAddSet: (memberExerciseId: string) => void;
  onBwToggle: (memberExerciseId: string, next: boolean) => void;
}
```

Add inside the component, **after** the `if (mode === 'edit')` block:

```tsx
  if (mode === 'logging') {
    const { loggingMembers, onInputChange, onLogSet, onAddSet, onBwToggle } = props;
    return (
      <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
        <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">Superset</span>
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
              onInputChange={(idx, field, value) => onInputChange(m.row.exerciseId, idx, field, value)}
              onLogSet={(idx) => onLogSet(m.row.exerciseId, idx)}
              onAddSet={() => onAddSet(m.row.exerciseId)}
              onBwToggle={(next) => onBwToggle(m.row.exerciseId, next)}
            />
          </Fragment>
        ))}
      </div>
    );
  }
```

(The `members` prop is unused in logging mode but kept for type consistency; pass `members={[]}` from callers.)

Wait — the `BaseProps` requires `members`. To avoid that confusion, refactor: drop `members` from the discriminator, leave it only on `EditProps` and `ViewProps`. So redefine:

```tsx
interface BaseProps {
  groupId: string;
}
interface EditProps extends BaseProps {
  mode: 'edit';
  members: SupersetMember[];
  onChangeRow: (rowExerciseId: string, field: keyof ExerciseRowData, value: ExerciseRowData[keyof ExerciseRowData]) => void;
  onMoveRow: (rowExerciseId: string, dir: 'up' | 'down') => void;
  onDeleteRow: (rowExerciseId: string) => void;
  onAddToSuperset: () => void;
  onUngroup: () => void;
  onDeleteSuperset: () => void;
  errorRowIds?: Set<string>;
}
```

Apply the same pattern to `LoggingProps` (with `loggingMembers`) and `ViewProps` (with `viewMembers`).

Update the `members` reference inside the edit block to come from `props.members` after a `mode === 'edit'` narrowing — already true.

Update test file uses of `members`: keep them for edit mode; not affected.

- [ ] **Step 2: Run tests → existing pass; type errors fixed**

```bash
pnpm test -- --testPathPattern=superset-block
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/training/superset-block.tsx
git commit -m "feat(training): add logging mode to SupersetBlock"
```

---

### Task 3.3: Migrate `session-logger.tsx` to use new primitives

**Files:**
- Modify: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`

- [ ] **Step 1: Replace render section to use `<SupersetBlock mode="logging">` and `<ExerciseRow mode="logging">`**

Inside `session-logger.tsx`:

1. Remove the inline `renderExerciseCard` function (it duplicates ExerciseRow logging mode).
2. Replace the rendering JSX inside the `groups.map(...)` loop:

```tsx
        {groups.map((group) => {
          if (group.type === 'standalone') {
            const ex = group.exercise;
            return (
              <div key={ex.exerciseId} className="rounded-xl bg-card ring-1 ring-foreground/10">
                <ExerciseRow
                  mode="logging"
                  row={{
                    exerciseId: ex.exerciseId,
                    exerciseName: ex.exerciseName,
                    imageUrl: ex.imageUrl,
                    isBodyweight: ex.isBodyweight,
                    groupId: ex.groupId,
                    isSuperset: ex.isSuperset,
                    sets: ex.sets,
                    repsMin: ex.repsMin,
                    repsMax: ex.repsMax,
                    restSeconds: ex.restSeconds,
                  }}
                  label={ex.label}
                  loggingSets={group.sets.map((s) => ({
                    setNumber: s.setNumber,
                    prescribedRepsMin: s.prescribedRepsMin,
                    prescribedRepsMax: s.prescribedRepsMax,
                    actualWeight: s.actualWeight,
                    actualReps: s.actualReps,
                    completedAt: s.completedAt,
                    globalIndex: s.globalIndex,
                  }))}
                  inputs={inputs}
                  bwOverride={bwOverrides[ex.exerciseId]}
                  onInputChange={updateInput}
                  onLogSet={(idx) => void logSet(idx)}
                  onAddSet={() => void addSet(ex.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [ex.exerciseId]: next }))
                  }
                />
                {mode === 'trainer' && loggedForMember && (
                  <ExerciseNotePanel
                    memberId={loggedForMember.id}
                    exerciseId={ex.exerciseId}
                    exerciseName={ex.exerciseName}
                    sessionId={session._id}
                  />
                )}
              </div>
            );
          }
          return (
            <SupersetBlock
              key={group.groupId}
              mode="logging"
              groupId={group.groupId}
              loggingMembers={group.exercises.map(({ exercise, sets: exSets }) => ({
                row: {
                  exerciseId: exercise.exerciseId,
                  exerciseName: exercise.exerciseName,
                  imageUrl: exercise.imageUrl,
                  isBodyweight: exercise.isBodyweight,
                  groupId: exercise.groupId,
                  isSuperset: exercise.isSuperset,
                  sets: exercise.sets,
                  repsMin: exercise.repsMin,
                  repsMax: exercise.repsMax,
                  restSeconds: exercise.restSeconds,
                },
                label: exercise.label,
                loggingSets: exSets.map((s) => ({
                  setNumber: s.setNumber,
                  prescribedRepsMin: s.prescribedRepsMin,
                  prescribedRepsMax: s.prescribedRepsMax,
                  actualWeight: s.actualWeight,
                  actualReps: s.actualReps,
                  completedAt: s.completedAt,
                  globalIndex: s.globalIndex,
                }),
                ),
                inputs,
                bwOverride: bwOverrides[exercise.exerciseId],
              }))}
              onInputChange={(_, idx, field, value) => updateInput(idx, field, value)}
              onLogSet={(_, idx) => void logSet(idx)}
              onAddSet={(exId) => void addSet(exId)}
              onBwToggle={(exId, next) =>
                setBwOverrides((prev) => ({ ...prev, [exId]: next }))
              }
            />
          );
        })}
```

3. Remove the now-unused imports (`Check`, `Input`, `Button` for logging-card, `cn`, etc. — keep what is still referenced by header/footer).
4. Add `import { ExerciseRow } from '@/components/training/exercise-row';` and `import { SupersetBlock } from '@/components/training/superset-block';`
5. Migrate header/footer hex classes:
   - `border-[#0f0f0f]` → `border-foreground/10`
   - `text-[#555]` `text-[#666]` `text-[#777]` → `text-foreground/65`
   - `bg-[#050505]` → `bg-background`

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test -- --testPathPattern=session
pnpm lint
```

Fix any failures. Update existing tests that asserted on old DOM.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/plan/session/\[id\]/_components/session-logger.tsx
git commit -m "feat(training): migrate session-logger to new primitives"
```

---

### Task 3.4: Migrate `self-workout-session.tsx` to use new primitives

**Files:**
- Modify: `src/components/self-tracking/self-workout-session.tsx`

- [ ] **Step 1: Read the file**

```bash
wc -l src/components/self-tracking/self-workout-session.tsx
```

- [ ] **Step 2: Replace the rendering of set groups with the same primitives used in session-logger.tsx**

Apply the same pattern: standalone exercises → `<ExerciseRow mode="logging">`; superset groups → `<SupersetBlock mode="logging">`. Map `ISelfWorkoutSet` shape into `LoggingSetInput` (note self-tracking uses different field names — verify in the model file before writing the mapping; key fields are `actualWeight`, `actualReps`, `completedAt`, `setNumber`, `groupId`, `isSuperset`).

Migrate all `[#xxx]` to tokens within the file.

- [ ] **Step 3: Run tests + lint + build**

```bash
pnpm test
pnpm lint
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/self-tracking/self-workout-session.tsx
git commit -m "feat(training): migrate self-workout-session to new primitives"
```

---

## Stage 4 — Phase 3: Read-only template preview

### Task 4.1: Add `mode="view"` to ExerciseRow + SupersetBlock

**Files:**
- Modify: `src/components/training/exercise-row.tsx`
- Modify: `src/components/training/superset-block.tsx`
- Modify: corresponding test files

- [ ] **Step 1: Tests for view mode**

Append to `exercise-row.test.tsx`:

```tsx
describe('ExerciseRow (view mode)', () => {
  it('renders summary pills with no inputs and no chevrons', () => {
    render(
      <ExerciseRow
        mode="view"
        row={{
          exerciseId: 'a', exerciseName: 'Squat', imageUrl: null, isBodyweight: false,
          groupId: 'a', isSuperset: false, sets: 4, repsMin: 6, repsMax: 8, restSeconds: 90,
        }}
        label="A"
      />,
    );
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText(/sets:\s*4/i)).toBeInTheDocument();
    expect(screen.getByText(/reps:\s*6\s*–\s*8/i)).toBeInTheDocument();
    expect(screen.getByText(/rest:\s*90s/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/sets/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /move up/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Replace `// view mode stub for P1; implemented in P3.` block in `exercise-row.tsx` with:

```tsx
  // mode === 'view'
  const repsLabel = row.repsMin === row.repsMax ? `${row.repsMin}` : `${row.repsMin}–${row.repsMax}`;
  return (
    <div
      data-testid="exercise-row"
      className={
        props.inSuperset
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
            <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
              Reps: {repsLabel}
            </span>
            {row.restSeconds !== null && (
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                Rest: {row.restSeconds}s
              </span>
            )}
            {row.isBodyweight && (
              <span className="text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">BW</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: View mode for SupersetBlock**

In `superset-block.tsx`, add after the logging block:

```tsx
  // mode === 'view'
  const { viewMembers } = props as { viewMembers: SupersetMember[] };
  return (
    <div className="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
      <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">Superset</span>
      </div>
      {viewMembers.map((m, i) => (
        <Fragment key={m.row.exerciseId}>
          {i > 0 && <div className="h-px bg-foreground/10" />}
          <ExerciseRow mode="view" row={m.row} label={m.label} inSuperset />
        </Fragment>
      ))}
    </div>
  );
```

And add to the prop discriminator:

```tsx
interface ViewProps extends BaseProps {
  mode: 'view';
  viewMembers: SupersetMember[];
}
```

Note: `BaseProps` itself in `ExerciseRow` already has optional `inSuperset`. Add `inSuperset?: boolean` to `BaseProps` of `ExerciseRow` if missing (it is on the existing BaseProps).

- [ ] **Step 4: Run tests + lint**

```bash
pnpm test -- --testPathPattern="(exercise-row|superset-block)"
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-row.tsx src/components/training/superset-block.tsx __tests__/components/training/exercise-row.test.tsx
git commit -m "feat(training): add view mode to row + superset primitives"
```

---

### Task 4.2: Read-only trainer preview page

**Files:**
- Verify existence of `src/app/(dashboard)/trainer/plans/[id]/page.tsx`. If absent, create. If present and shows edit-by-default, restructure to add a separate view path.

- [ ] **Step 1: Check existing structure**

```bash
ls src/app/\(dashboard\)/trainer/plans/\[id\]/
```

- [ ] **Step 2: Create or update `src/app/(dashboard)/trainer/plans/[id]/page.tsx`**

If it does not exist (only `[id]/edit/` exists), create:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/connect';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';
import { Button } from '@/components/ui/button';
import { TemplatePreview } from './_components/template-preview';

export default async function PlanTemplateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) notFound();
  await connectDB();
  const tpl = await PlanTemplateModel.findById(id).lean();
  if (!tpl) notFound();

  return (
    <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">{tpl.name}</h1>
          {tpl.description && (
            <p className="text-sm text-foreground/65 mt-1">{tpl.description}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/trainer/plans/${id}/edit`}>Edit Plan</Link>
        </Button>
      </div>
      <TemplatePreview
        days={tpl.days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map((e) => ({
            ...e,
            exerciseId: String(e.exerciseId),
          })),
        }))}
      />
    </div>
  );
}
```

If it does exist, replace the body to render the same component.

- [ ] **Step 3: Create `_components/template-preview.tsx`**

```tsx
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
    | { kind: 'standalone'; exercise: typeof labelled[number] }
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
        members: labelled
          .filter((e) => e.isSuperset && e.groupId === ex.groupId)
          .map((e) => ({ row: e as ExerciseRowData, label: e.label })),
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
```

- [ ] **Step 4: Run lint + build**

```bash
pnpm lint && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/plans/\[id\]/
git commit -m "feat(training): add read-only template preview page"
```

---

## Stage 5 — Wrap-up

### Task 5.1: Hex audit + final test run

- [ ] **Step 1:** Audit for any remaining hex literals in touched files

```bash
grep -rE "(bg|text|border|ring)-\[#" \
  src/components/training/ \
  src/app/\(dashboard\)/trainer/plans/ \
  src/app/\(dashboard\)/member/plan/session/ \
  src/components/self-tracking/self-workout-session.tsx
```

Expected: no matches (or, only matches that pre-date this work and are out of scope — note them, do not block).

- [ ] **Step 2:** Full test pass + lint + build

```bash
pnpm test && pnpm lint && pnpm build
```

- [ ] **Step 3:** `/simplify` (manual: re-read the diff and apply DRY/YAGNI fixes)

- [ ] **Step 4:** Final summary commit (only if cleanups applied)

```bash
git status
# if changes:
git add -A
git commit -m "chore(training): post-redesign cleanup pass"
```

---

## Done

All three phases complete:
- P1 ✅ template editor redesigned, supersets explicit, hex tokens migrated
- P2 ✅ logging surfaces share primitives
- P3 ✅ read-only preview added
