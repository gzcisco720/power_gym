# Calendar Popover + Day Complete Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 4 standalone `/calendar` pages with reusable popover components, add day-level Complete button + sticky bar, upgrade calendar cell visuals (kcal + dot markers).

**Architecture:** New `NutritionCalendarPopover` / `WorkoutCalendarPopover` components wrap shadcn-style Popover (using `@base-ui/react/popover`) around existing `SelfNutritionCalendar` / `SelfWorkoutCalendar`. `SelfNutritionDayView` gets a sticky `DayCompleteBar` and a date-button trigger. Both PageHeader trigger and date-button trigger use URL query (`?date=YYYY-MM-DD`) as source of truth. Old `/calendar` routes deleted.

**Tech Stack:** Next.js App Router, React 19, `@base-ui/react` (popover primitive), TailwindCSS, Jest + Testing Library, Playwright.

**Spec:** [my-nutrition-refactor-design.md](./my-nutrition-refactor-design.md)

---

## Conventions reused throughout this plan

- Test command: `pnpm test --testPathPatterns=<pattern>` (plural)
- Lint: `pnpm lint`
- Build: `pnpm build`
- Project rules: NO `any`/`unknown` in production; theme tokens (no hex); ESLint forbids synchronous `setState` in effect bodies
- Commit prefix: `refactor(self-tracking):` or `feat(self-tracking):` per task

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `src/components/ui/popover.tsx` | Thin wrapper around `@base-ui/react/popover`, mirroring `dialog.tsx` style |
| `src/components/self-tracking/nutrition-calendar-popover.tsx` | Self-contained popover: trigger as children, fetches month data, anchors `SelfNutritionCalendar` |
| `src/components/self-tracking/workout-calendar-popover.tsx` | Same for workouts |
| `src/components/self-tracking/nutrition-calendar-header-trigger.tsx` | Client component placed in PageHeader actions slot for nutrition pages |
| `src/components/self-tracking/workout-calendar-header-trigger.tsx` | Same for training pages |
| `src/components/self-tracking/day-complete-bar.tsx` | Sticky bottom bar with status text + Mark complete button |
| `__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx` | New test |
| `__tests__/components/self-tracking/self-nutrition-day-view.test.tsx` | New test for Mark complete behavior |

### Modified

| Path | Change |
|---|---|
| `src/components/self-tracking/self-nutrition-calendar.tsx` | Cell layout: w-9×h-11, vertical (number / kcal / dot), updated aria-label |
| `src/components/self-tracking/self-workout-calendar.tsx` | Cell layout: w-9×h-11, vertical (number / dot), updated aria-label |
| `src/components/self-tracking/self-nutrition-day-view.tsx` | Wrap top date row in popover trigger; remove inline state, use URL query; add `<DayCompleteBar>` |
| `src/app/(dashboard)/owner/my-nutrition/page.tsx` | Read `?date=` query, replace `View Calendar →` link with `<NutritionCalendarHeaderTrigger>` |
| `src/app/(dashboard)/trainer/my-nutrition/page.tsx` | Same |
| `src/app/(dashboard)/owner/my-training/page.tsx` | Replace link with `<WorkoutCalendarHeaderTrigger>` |
| `src/app/(dashboard)/trainer/my-training/page.tsx` | Same |
| `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx` | Update aria-label selector for new format |
| `e2e/self-tracking/trainer-freestyle-workout.spec.ts` | Drop `/calendar` redirect expectation; assert returns to start card or active log |
| `e2e/self-tracking/trainer-template-workout.spec.ts` | Same |
| `e2e/self-tracking/owner-nutrition-day.spec.ts` | Add Mark day complete verification |

### Deleted

```
src/app/(dashboard)/owner/my-training/calendar/page.tsx
src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx
src/app/(dashboard)/trainer/my-training/calendar/page.tsx
src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx
src/components/self-tracking/my-training-calendar-client.tsx
src/components/self-tracking/my-nutrition-calendar-client.tsx
```

---

## Stage 1 — Calendar cell visual upgrade

### Task 1.1: Add `<Popover>` UI primitive wrapper

**Files:**
- Create: `src/components/ui/popover.tsx`

- [ ] **Step 1.1.1: Create the wrapper file**

```tsx
// src/components/ui/popover.tsx
'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverPositioner({
  className,
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      sideOffset={6}
      className={cn('z-50 outline-none', className)}
      {...props}
    />
  );
}

function PopoverPopup({
  className,
  children,
  ...props
}: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Popup
      data-slot="popover-popup"
      className={cn(
        'rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-lg outline-none',
        'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </PopoverPrimitive.Popup>
  );
}

export { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup };
```

- [ ] **Step 1.1.2: Lint sanity check**

```bash
pnpm lint
```
Expected: 0 warnings.

- [ ] **Step 1.1.3: Commit**

```bash
git add src/components/ui/popover.tsx
git commit -m "feat(ui): add Popover primitive wrapper"
```

---

### Task 1.2: Upgrade `SelfNutritionCalendar` cell visual

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-calendar.tsx`
- Modify: `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx`

The cell needs to switch from `w-8 h-8 rounded-full` (single number) to `w-9 h-11 rounded-md` with vertical layout: number → kcal (if log) → dot (if log). The existing test must update its aria-label selector.

- [ ] **Step 1.2.1: Update the test first to match the new aria-label format**

Replace the existing test file content with:

```tsx
// __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfNutritionCalendar } from '@/components/self-tracking/self-nutrition-calendar';

describe('SelfNutritionCalendar', () => {
  it('highlights days with logs and triggers onSelect with kcal-aware aria-label (in progress)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sample = [{ date: today, kcal: 2000, dayLabel: 'Freestyle', dayCompleted: false }];
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);

    const dayNum = new Date().getDate();
    const dayBtn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 2000 kcal, in progress`, 'i'),
    });
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(sample[0]);
  });

  it('marks day-completed entries with "completed" in aria-label', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sample = [{ date: today, kcal: 1500, dayLabel: 'Freestyle', dayCompleted: true }];
    render(<SelfNutritionCalendar entries={sample} onSelect={jest.fn()} />);
    const dayNum = new Date().getDate();
    const btn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 1500 kcal, completed`, 'i'),
    });
    expect(btn).toBeInTheDocument();
  });
});
```

- [ ] **Step 1.2.2: Run test, expect FAIL**

```bash
pnpm test --testPathPatterns=self-nutrition-calendar
```
Expected: FAIL — `dayCompleted` not on entry type, aria-label doesn't include kcal.

- [ ] **Step 1.2.3: Update the calendar component**

Replace the entire file:

```tsx
// src/components/self-tracking/self-nutrition-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NutritionDayEntry {
  date: string; // 'YYYY-MM-DD'
  kcal: number;
  dayLabel: string;
  dayCompleted: boolean;
}

interface Props {
  entries: NutritionDayEntry[];
  onSelect: (entry: NutritionDayEntry) => void;
  selectedDate?: string;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return { startOffset: (firstDay + 6) % 7, daysInMonth };
}

export function SelfNutritionCalendar({ entries, onSelect, selectedDate, onMonthChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, NutritionDayEntry>();
    for (const e of entries) {
      const [y, m, d] = e.date.split('-').map(Number);
      if (y === year && m === month) map.set(d, e);
    }
    return map;
  }, [entries, year, month]);

  function shift(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDay = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button
          onClick={() => shift(1)}
          aria-label="Next month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const entry = entriesByDay.get(day);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = entry && dateStr === selectedDate;
          const isToday = isCurrentMonth && day === todayDay;
          const status = entry ? (entry.dayCompleted ? 'completed' : 'in progress') : null;
          const ariaLabel = entry
            ? `Day ${day}, ${entry.kcal} kcal, ${status}`
            : `Day ${day}`;

          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => entry && onSelect(entry)}
                disabled={!entry}
                aria-label={ariaLabel}
                className={cn(
                  'w-9 h-11 rounded-md text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isSelected && 'bg-foreground text-background font-bold',
                  !isSelected && entry && 'text-foreground hover:bg-foreground/10',
                  !entry && 'text-foreground/40',
                  isToday && !isSelected && 'ring-1 ring-foreground/25',
                )}
              >
                <span className="leading-none">{day}</span>
                {entry && (
                  <span className={cn(
                    'text-[9px] tabular-nums leading-none',
                    isSelected ? 'text-background/80' :
                      entry.dayCompleted ? 'text-emerald-300' : 'text-emerald-300/70',
                  )}>
                    {entry.kcal}
                  </span>
                )}
                {entry && (
                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' :
                      entry.dayCompleted ? 'bg-emerald-500' : 'bg-emerald-500/40',
                  )} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 1.2.4: Run test, expect PASS**

```bash
pnpm test --testPathPatterns=self-nutrition-calendar
```
Expected: 2/2 PASS.

- [ ] **Step 1.2.5: Lint**

```bash
pnpm lint
```

- [ ] **Step 1.2.6: Commit**

```bash
git add src/components/self-tracking/self-nutrition-calendar.tsx __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
git commit -m "refactor(self-tracking): upgrade nutrition calendar cell with kcal+dot markers"
```

---

### Task 1.3: Upgrade `SelfWorkoutCalendar` cell visual (dot only)

**Files:**
- Modify: `src/components/self-tracking/self-workout-calendar.tsx`

No existing test for this component. Cell adds a dot below day number for days with completed sessions.

- [ ] **Step 1.3.1: Replace the file**

```tsx
// src/components/self-tracking/self-workout-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelfLogSummary {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  logs: SelfLogSummary[];
  onSelect: (log: SelfLogSummary) => void;
  selectedId?: string | null;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  return { startOffset, daysInMonth };
}

export function SelfWorkoutCalendar({ logs, onSelect, selectedId, onMonthChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const logsByDay = useMemo(() => {
    const map = new Map<number, SelfLogSummary>();
    for (const l of logs) {
      const d = new Date(l.completedAt);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        map.set(d.getDate(), l);
      }
    }
    return map;
  }, [logs, year, month]);

  function shiftMonth(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = now.getDate();

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftMonth(-1)} className="text-foreground/65 hover:text-foreground transition-colors" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button onClick={() => shiftMonth(1)} className="text-foreground/65 hover:text-foreground transition-colors" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const log = logsByDay.get(day);
          const isToday = isCurrentMonth && day === todayDay;
          const isSelected = log && log._id === selectedId;
          const ariaLabel = log
            ? `Day ${day}, ${log.dayName}`
            : `Day ${day}`;

          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => log && onSelect(log)}
                disabled={!log}
                aria-label={ariaLabel}
                className={cn(
                  'w-9 h-11 rounded-md text-[11px] flex flex-col items-center justify-center gap-1 transition-colors',
                  isSelected && 'bg-foreground text-background font-bold',
                  !isSelected && log && 'text-foreground hover:bg-foreground/10',
                  !log && 'text-foreground/40',
                  isToday && !isSelected && 'ring-1 ring-foreground/25',
                )}
              >
                <span className="leading-none">{day}</span>
                {log && (
                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' : 'bg-emerald-500',
                  )} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 1.3.2: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/self-workout-calendar.tsx
git commit -m "refactor(self-tracking): upgrade workout calendar cell with dot marker"
```

---

## Stage 2 — Popover components

### Task 2.1: `NutritionCalendarPopover`

**Files:**
- Create: `src/components/self-tracking/nutrition-calendar-popover.tsx`
- Create: `__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx`

- [ ] **Step 2.1.1: Write the failing test**

```tsx
// __tests__/components/self-tracking/nutrition-calendar-popover.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionCalendarPopover } from '@/components/self-tracking/nutrition-calendar-popover';

const today = new Date().toISOString().slice(0, 10);

describe('NutritionCalendarPopover', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { date: today, dayLabel: 'Freestyle', dayCompleted: false, meals: [{ items: [{ kcal: 1500 }] }] },
      ]),
    });
  });

  it('opens popover when trigger is clicked and fires onSelect with a date string', async () => {
    const onSelect = jest.fn();
    render(
      <NutritionCalendarPopover
        onSelect={onSelect}
        trigger={<button>Open</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dayNum = new Date().getDate();
    const dayBtn = await waitFor(() =>
      screen.getByRole('button', {
        name: new RegExp(`Day ${dayNum}, 1500 kcal, in progress`, 'i'),
      }),
    );
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(today);
  });
});
```

- [ ] **Step 2.1.2: Run, expect FAIL (module not found)**

```bash
pnpm test --testPathPatterns=nutrition-calendar-popover
```

- [ ] **Step 2.1.3: Implement**

```tsx
// src/components/self-tracking/nutrition-calendar-popover.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup } from '@/components/ui/popover';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

interface RawLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { items: { kcal: number }[] }[];
}

interface Props {
  trigger: ReactNode;
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export function NutritionCalendarPopover({ trigger, onSelect, selectedDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<>{trigger}</>} />
      {open && (
        <PopoverPortal>
          <PopoverPositioner align="end">
            <PopoverPopup className="w-[296px] p-0">
              <NutritionCalendarBody
                onSelect={(date) => {
                  setOpen(false);
                  onSelect(date);
                }}
                selectedDate={selectedDate}
              />
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      )}
    </Popover>
  );
}

interface BodyProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

function NutritionCalendarBody({ onSelect, selectedDate }: BodyProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        if (cancelled) return;
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            dayCompleted: l.dayCompleted,
            kcal: l.meals.flatMap((m) => m.items).reduce((s, it) => s + it.kcal, 0),
          })),
        );
      });
    return () => { cancelled = true; };
  }, [year, month]);

  return (
    <SelfNutritionCalendar
      entries={entries}
      onSelect={(e) => onSelect(e.date)}
      selectedDate={selectedDate}
      onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
    />
  );
}
```

> **Implementer note**: `@base-ui/react/popover`'s `PopoverTrigger` takes its child via the `render` prop pattern (similar to dialog). If the test fails because the trigger doesn't open the popup, inspect the actual base-ui API by `cat node_modules/@base-ui/react/dist/popover/index.d.ts | head -60` and adjust. Common alternatives: `<PopoverTrigger asChild>{trigger}</PopoverTrigger>` if base-ui supports `asChild`. Use whatever the existing `dialog.tsx` patterns suggests is canonical for this project.

- [ ] **Step 2.1.4: Run, expect PASS**

```bash
pnpm test --testPathPatterns=nutrition-calendar-popover
```

If the popover doesn't render the calendar synchronously (base-ui may animate), the test uses `waitFor`. If still flaky, check whether base-ui's Popover uses portals or appends to document.body — Testing Library should pick up portaled content automatically.

- [ ] **Step 2.1.5: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/nutrition-calendar-popover.tsx __tests__/components/self-tracking/nutrition-calendar-popover.test.tsx
git commit -m "feat(self-tracking): add NutritionCalendarPopover"
```

---

### Task 2.2: `WorkoutCalendarPopover`

**Files:**
- Create: `src/components/self-tracking/workout-calendar-popover.tsx`

No new test in this task — covered by E2E flows in Stage 7.

- [ ] **Step 2.2.1: Implement**

```tsx
// src/components/self-tracking/workout-calendar-popover.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup } from '@/components/ui/popover';
import { SelfWorkoutCalendar } from './self-workout-calendar';

interface SelfLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  trigger: ReactNode;
  onSelectLog: (logId: string) => void;
}

export function WorkoutCalendarPopover({ trigger, onSelectLog }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<>{trigger}</>} />
      {open && (
        <PopoverPortal>
          <PopoverPositioner align="end">
            <PopoverPopup className="w-[296px] p-0">
              <WorkoutCalendarBody
                onSelect={(logId) => {
                  setOpen(false);
                  onSelectLog(logId);
                }}
              />
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      )}
    </Popover>
  );
}

interface BodyProps {
  onSelect: (logId: string) => void;
}

function WorkoutCalendarBody({ onSelect }: BodyProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: SelfLog[]) => {
        if (cancelled) return;
        setLogs(data.filter((l) => l.completedAt !== null));
      });
    return () => { cancelled = true; };
  }, [year, month]);

  // Cast logs to the shape SelfWorkoutCalendar expects (completedAt string, not null).
  const filtered = logs as Array<SelfLog & { completedAt: string }>;

  return (
    <SelfWorkoutCalendar
      logs={filtered}
      onSelect={(l) => onSelect(l._id)}
      onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
    />
  );
}
```

- [ ] **Step 2.2.2: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/workout-calendar-popover.tsx
git commit -m "feat(self-tracking): add WorkoutCalendarPopover"
```

---

## Stage 3 — `SelfNutritionDayView` refactor

### Task 3.1: Add `<DayCompleteBar>` sticky component

**Files:**
- Create: `src/components/self-tracking/day-complete-bar.tsx`

- [ ] **Step 3.1.1: Implement**

```tsx
// src/components/self-tracking/day-complete-bar.tsx
'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  dayCompleted: boolean;
  kcal: number;
  totalItems: number;
  onMarkComplete: () => void | Promise<void>;
  submitting: boolean;
}

export function DayCompleteBar({ dayCompleted, kcal, totalItems, onMarkComplete, submitting }: Props) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex items-center justify-between gap-3">
      <span className="text-xs text-foreground/65">
        {dayCompleted ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500 inline mr-1" />
            Day completed · {kcal} kcal
          </>
        ) : (
          <>
            {kcal} kcal · {totalItems} {totalItems === 1 ? 'item' : 'items'} logged
          </>
        )}
      </span>
      <Button
        onClick={() => void onMarkComplete()}
        disabled={dayCompleted || submitting}
        variant={dayCompleted ? 'outline' : 'default'}
      >
        {dayCompleted ? 'Day completed ✓' : 'Mark day complete'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3.1.2: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/day-complete-bar.tsx
git commit -m "feat(self-tracking): add DayCompleteBar component"
```

---

### Task 3.2: Refactor `SelfNutritionDayView` — wire DayCompleteBar + date trigger

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-day-view.tsx`
- Create: `__tests__/components/self-tracking/self-nutrition-day-view.test.tsx`

This task uses local state for `date` (not URL query yet — Stage 4 wires URL). It adds the popover trigger on the date string, and replaces the per-meal toggle nothing (`MealSection` remains untouched). It wires `<DayCompleteBar>` at the bottom.

- [ ] **Step 3.2.1: Write the failing test**

```tsx
// __tests__/components/self-tracking/self-nutrition-day-view.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

describe('SelfNutritionDayView', () => {
  beforeEach(() => {
    let putBody: unknown = null;
    global.fetch = jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        putBody = JSON.parse(init.body ?? '{}');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ _id: 'log1' }),
        });
      }
      // GET
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [],
          dayCompleted: false,
        }),
      });
    });
    (global as unknown as { __putBody: () => unknown }).__putBody = () => putBody;
  });

  it('Mark day complete posts dayCompleted: true', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    fireEvent.click(btn);
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean } }).__putBody();
      expect(body.dayCompleted).toBe(true);
    });
  });

  it('shows "Day completed" disabled when dayCompleted is true on initial load', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [],
          dayCompleted: true,
        }),
      });
    });
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /day completed/i }));
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 3.2.2: Run, expect FAIL**

```bash
pnpm test --testPathPatterns=self-nutrition-day-view
```

- [ ] **Step 3.2.3: Update the day view**

Read the existing file `src/components/self-tracking/self-nutrition-day-view.tsx` first. Then replace it with:

```tsx
// src/components/self-tracking/self-nutrition-day-view.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';
import { DayCompleteBar } from './day-complete-bar';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { MealSection } from '@/components/nutrition/meal-section';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { ISelfMeal, ISelfMealItem } from '@/lib/db/models/self-nutrition-log.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { PickedFood } from '@/components/nutrition/food-picker';

const OPTIONAL_MACRO_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'polyols', 'cholesterol', 'sodium', 'potassium', 'transFat',
] as const;

const DEFAULT_MEALS: ISelfMeal[] = [
  { name: 'Breakfast', order: 0, completed: false, items: [] },
  { name: 'Lunch', order: 1, completed: false, items: [] },
  { name: 'Dinner', order: 2, completed: false, items: [] },
  { name: 'Snack', order: 3, completed: false, items: [] },
];

interface SelfNutritionLog {
  date: string;
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

interface Props {
  initialDate: string;
  readOnly?: boolean;
  onDateChange?: (date: string) => void;
}

function aggregate(meals: ISelfMeal[]): MacroSnapshot {
  const totals: MacroSnapshot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    for (const i of m.items) {
      totals.kcal += i.kcal;
      totals.protein += i.protein;
      totals.carbs += i.carbs;
      totals.fat += i.fat;
      for (const k of OPTIONAL_MACRO_KEYS) {
        const v = i[k];
        if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v;
      }
    }
  }
  return totals;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pickedFoodToItem(picked: PickedFood): ISelfMealItem {
  const item: ISelfMealItem = {
    foodName: picked.foodName,
    quantityG: picked.quantityG,
    kcal: picked.macros.kcal,
    protein: picked.macros.protein,
    carbs: picked.macros.carbs,
    fat: picked.macros.fat,
  };
  for (const k of OPTIONAL_MACRO_KEYS) {
    const v = picked.macros[k];
    if (typeof v === 'number') item[k] = v;
  }
  return item;
}

export function SelfNutritionDayView({ initialDate, readOnly = false, onDateChange }: Props) {
  const [date, setDateInternal] = useState(initialDate);

  // Sync external initialDate prop changes (e.g., URL query update from Stage 4).
  useEffect(() => {
    setDateInternal(initialDate);
  }, [initialDate]);

  const [log, setLog] = useState<SelfNutritionLog | null>(null);
  const [pickerForMeal, setPickerForMeal] = useState<number | null>(null);
  const [submittingComplete, setSubmittingComplete] = useState(false);

  function setDate(next: string): void {
    setDateInternal(next);
    onDateChange?.(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const res = await fetch(`/api/me/nutrition-logs/${date}`);
      if (cancelled) return;
      const data = res.ok ? ((await res.json()) as SelfNutritionLog | null) : null;
      setLog(
        data ?? {
          date,
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: DEFAULT_MEALS,
          dayCompleted: false,
        },
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const macros = useMemo(
    () => (log ? aggregate(log.meals) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }),
    [log],
  );

  const totalItems = useMemo(
    () => (log ? log.meals.reduce((s, m) => s + m.items.length, 0) : 0),
    [log],
  );

  async function persist(next: SelfNutritionLog): Promise<void> {
    setLog(next);
    if (readOnly) return;
    await fetch(`/api/me/nutrition-logs/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceTemplateId: next.sourceTemplateId,
        sourceTemplateDayTypeName: next.sourceTemplateDayTypeName,
        dayLabel: next.dayLabel,
        meals: next.meals,
        dayCompleted: next.dayCompleted,
      }),
    });
  }

  async function markDayComplete(): Promise<void> {
    if (!log) return;
    setSubmittingComplete(true);
    const next: SelfNutritionLog = { ...log, dayCompleted: true };
    await persist(next);
    setSubmittingComplete(false);
  }

  if (!log) return <div className="p-4 text-foreground/65 text-sm">Loading…</div>;

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(shiftDate(date, -1))}
          disabled={readOnly}
        >
          ← {shiftDate(date, -1)}
        </Button>
        <NutritionCalendarPopover
          onSelect={(d) => setDate(d)}
          selectedDate={date}
          trigger={
            <button
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              disabled={readOnly}
              aria-label={`Open calendar (${date})`}
            >
              {date}
              <ChevronDown className="h-3 w-3 text-foreground/65" />
            </button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={readOnly}
        >
          {shiftDate(date, 1)} →
        </Button>
      </div>

      <MacroSummaryCard macros={macros} />

      <div className="space-y-3">
        {log.meals.map((m, i) => (
          <MealSection
            key={i}
            meal={m as unknown as IDailyLogMeal}
            locked={readOnly}
            onAddFood={() => setPickerForMeal(i)}
            onToggleComplete={() => {
              const next: SelfNutritionLog = {
                ...log,
                meals: log.meals.map((mm, j) =>
                  j === i ? { ...mm, completed: !mm.completed } : mm,
                ),
              };
              void persist(next);
            }}
            onRemoveItem={(itemIdx) => {
              const next: SelfNutritionLog = {
                ...log,
                meals: log.meals.map((mm, j) =>
                  j === i ? { ...mm, items: mm.items.filter((_, k) => k !== itemIdx) } : mm,
                ),
              };
              void persist(next);
            }}
          />
        ))}
      </div>

      <FoodPickerDialog
        open={pickerForMeal !== null}
        onOpenChange={(o) => {
          if (!o) setPickerForMeal(null);
        }}
        memberId={null}
        onSelect={(picked) => {
          if (pickerForMeal === null) return;
          const item = pickedFoodToItem(picked);
          const next: SelfNutritionLog = {
            ...log,
            meals: log.meals.map((mm, j) =>
              j === pickerForMeal ? { ...mm, items: [...mm.items, item] } : mm,
            ),
          };
          setPickerForMeal(null);
          void persist(next);
        }}
      />

      {!readOnly && (
        <SaveDayAsTemplate
          onSubmit={async ({ name, description }) => {
            const res = await fetch(`/api/me/nutrition-logs/${date}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceTemplateId: log.sourceTemplateId,
                sourceTemplateDayTypeName: log.sourceTemplateDayTypeName,
                dayLabel: log.dayLabel,
                meals: log.meals,
                dayCompleted: log.dayCompleted,
                saveAsTemplate: {
                  name: name.trim(),
                  description: description.trim() || undefined,
                },
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { createdTemplateId?: string };
              if (data.createdTemplateId) toast.success('Saved as template');
            } else {
              toast.error('Failed to save template');
            }
          }}
        />
      )}

      {!readOnly && (
        <DayCompleteBar
          dayCompleted={log.dayCompleted}
          kcal={Math.round(macros.kcal)}
          totalItems={totalItems}
          onMarkComplete={markDayComplete}
          submitting={submittingComplete}
        />
      )}
    </div>
  );
}

interface SaveDayAsTemplateProps {
  onSubmit: (v: { name: string; description: string }) => Promise<void>;
}

function SaveDayAsTemplate({ onSubmit }: SaveDayAsTemplateProps) {
  const [save, setSave] = useState<{ name: string; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = save !== null && save.name.trim() !== '';

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-3">
      <SaveAsTemplateCheckbox value={save} onChange={setSave} />
      <Button
        size="sm"
        disabled={!canSubmit || submitting}
        onClick={async () => {
          if (!save) return;
          setSubmitting(true);
          await onSubmit(save);
          setSubmitting(false);
          setSave(null);
        }}
      >
        Save as template
      </Button>
    </div>
  );
}
```

- [ ] **Step 3.2.4: Run test, expect PASS**

```bash
pnpm test --testPathPatterns=self-nutrition-day-view
```

- [ ] **Step 3.2.5: Run full suite, no regressions**

```bash
pnpm test
```

- [ ] **Step 3.2.6: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/self-nutrition-day-view.tsx __tests__/components/self-tracking/self-nutrition-day-view.test.tsx
git commit -m "refactor(self-tracking): wire DayCompleteBar and date popover into SelfNutritionDayView"
```

---

## Stage 4 — URL query (`?date=`) integration

### Task 4.1: Read `?date=` from URL in `my-nutrition` page (owner)

**Files:**
- Modify: `src/app/(dashboard)/owner/my-nutrition/page.tsx`

- [ ] **Step 4.1.1: Update the page to parse query**

Replace the file:

```tsx
// src/app/(dashboard)/owner/my-nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OwnerMyNutritionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  const { date: rawDate } = await searchParams;
  const date = rawDate && DATE_RE.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link
            href="/owner/my-nutrition/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayViewWithRouter initialDate={date} />
      </div>
    </div>
  );
}

// (View wrapper added below — see Step 4.1.2)
```

> The `<Link>` in PageHeader still points to the old `/calendar` route — Stage 5 swaps it for the popover trigger. Stage 6 deletes the link target.

- [ ] **Step 4.1.2: Add a tiny client wrapper that pushes URL changes**

Inside the page file, add at the bottom:

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView as SelfNutritionDayViewClient } from '@/components/self-tracking/self-nutrition-day-view';

function SelfNutritionDayViewWithRouter({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`/owner/my-nutrition?date=${d}`, { scroll: false });
    },
    [router],
  );
  return <SelfNutritionDayViewClient initialDate={initialDate} onDateChange={onDateChange} />;
}
```

> **Issue:** mixing `'use client'` and a default-exported async server component in one file does not work. Fix: move the wrapper to its own file `_components/with-router.tsx`. See Step 4.1.3.

- [ ] **Step 4.1.3: Move client wrapper to its own file**

Create `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
}

export function SelfNutritionDayViewWithRouter({ initialDate, basePath }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`${basePath}?date=${d}`, { scroll: false });
    },
    [router, basePath],
  );
  return <SelfNutritionDayView initialDate={initialDate} onDateChange={onDateChange} />;
}
```

Then re-update `src/app/(dashboard)/owner/my-nutrition/page.tsx` to use it:

```tsx
// src/app/(dashboard)/owner/my-nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayViewWithRouter } from './_components/day-view-with-router';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OwnerMyNutritionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  const { date: rawDate } = await searchParams;
  const date = rawDate && DATE_RE.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link
            href="/owner/my-nutrition/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayViewWithRouter initialDate={date} basePath="/owner/my-nutrition" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4.1.4: Lint, build, commit**

```bash
pnpm lint
pnpm build 2>&1 | tail -10
git add src/app/\(dashboard\)/owner/my-nutrition
git commit -m "refactor(self-tracking): wire owner nutrition page to ?date= query"
```

---

### Task 4.2: Same wiring for trainer nutrition page

**Files:**
- Create: `src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx`
- Modify: `src/app/(dashboard)/trainer/my-nutrition/page.tsx`

- [ ] **Step 4.2.1: Create the trainer wrapper**

```tsx
// src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
}

export function SelfNutritionDayViewWithRouter({ initialDate }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`/trainer/my-nutrition?date=${d}`, { scroll: false });
    },
    [router],
  );
  return <SelfNutritionDayView initialDate={initialDate} onDateChange={onDateChange} />;
}
```

- [ ] **Step 4.2.2: Update the trainer page**

```tsx
// src/app/(dashboard)/trainer/my-nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayViewWithRouter } from './_components/day-view-with-router';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function TrainerMyNutritionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  const { date: rawDate } = await searchParams;
  const date = rawDate && DATE_RE.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link
            href="/trainer/my-nutrition/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayViewWithRouter initialDate={date} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2.3: Lint, build, commit**

```bash
pnpm lint
pnpm build 2>&1 | tail -10
git add src/app/\(dashboard\)/trainer/my-nutrition
git commit -m "refactor(self-tracking): wire trainer nutrition page to ?date= query"
```

---

## Stage 5 — PageHeader 📅 trigger client components

### Task 5.1: Create header trigger components

**Files:**
- Create: `src/components/self-tracking/nutrition-calendar-header-trigger.tsx`
- Create: `src/components/self-tracking/workout-calendar-header-trigger.tsx`

- [ ] **Step 5.1.1: Implement nutrition trigger**

```tsx
// src/components/self-tracking/nutrition-calendar-header-trigger.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';

interface Props {
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
}

export function NutritionCalendarHeaderTrigger({ basePath }: Props) {
  const router = useRouter();
  return (
    <NutritionCalendarPopover
      onSelect={(date) => router.push(`${basePath}?date=${date}`, { scroll: false })}
      trigger={
        <button
          aria-label="Open calendar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}
```

- [ ] **Step 5.1.2: Implement workout trigger**

```tsx
// src/components/self-tracking/workout-calendar-header-trigger.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { WorkoutCalendarPopover } from './workout-calendar-popover';

interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training';
}

export function WorkoutCalendarHeaderTrigger({ basePath }: Props) {
  const router = useRouter();
  return (
    <WorkoutCalendarPopover
      onSelectLog={(logId) => router.push(`${basePath}/session/${logId}`)}
      trigger={
        <button
          aria-label="Open calendar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}
```

- [ ] **Step 5.1.3: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/nutrition-calendar-header-trigger.tsx src/components/self-tracking/workout-calendar-header-trigger.tsx
git commit -m "feat(self-tracking): add calendar header trigger components"
```

---

### Task 5.2: Wire header triggers into 4 pages (replace `View Calendar →` link)

**Files:**
- Modify: `src/app/(dashboard)/owner/my-nutrition/page.tsx`
- Modify: `src/app/(dashboard)/trainer/my-nutrition/page.tsx`
- Modify: `src/app/(dashboard)/owner/my-training/page.tsx`
- Modify: `src/app/(dashboard)/trainer/my-training/page.tsx`

- [ ] **Step 5.2.1: Update owner nutrition page**

In `src/app/(dashboard)/owner/my-nutrition/page.tsx` replace:

```tsx
import Link from 'next/link';
// ...
        actions={
          <Link
            href="/owner/my-nutrition/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
```

with:

```tsx
import { NutritionCalendarHeaderTrigger } from '@/components/self-tracking/nutrition-calendar-header-trigger';
// ...
        actions={<NutritionCalendarHeaderTrigger basePath="/owner/my-nutrition" />}
```

Remove the now-unused `import Link from 'next/link';`.

- [ ] **Step 5.2.2: Update trainer nutrition page**

Same pattern in `src/app/(dashboard)/trainer/my-nutrition/page.tsx`. Use `basePath="/trainer/my-nutrition"`.

- [ ] **Step 5.2.3: Update owner training page**

```tsx
// src/app/(dashboard)/owner/my-training/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';
import { WorkoutCalendarHeaderTrigger } from '@/components/self-tracking/workout-calendar-header-trigger';

export default async function OwnerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={<WorkoutCalendarHeaderTrigger basePath="/owner/my-training" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/owner/my-training" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2.4: Update trainer training page**

```tsx
// src/app/(dashboard)/trainer/my-training/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';
import { WorkoutCalendarHeaderTrigger } from '@/components/self-tracking/workout-calendar-header-trigger';

export default async function TrainerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={<WorkoutCalendarHeaderTrigger basePath="/trainer/my-training" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/trainer/my-training" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2.5: Lint, build, full test, commit**

```bash
pnpm lint
pnpm build 2>&1 | tail -15
pnpm test 2>&1 | tail -5
git add src/app/\(dashboard\)/owner/my-nutrition/page.tsx src/app/\(dashboard\)/trainer/my-nutrition/page.tsx src/app/\(dashboard\)/owner/my-training/page.tsx src/app/\(dashboard\)/trainer/my-training/page.tsx
git commit -m "refactor(self-tracking): replace View Calendar links with popover triggers"
```

---

## Stage 6 — Delete the old `/calendar` routes

### Task 6.1: Delete page files + clients

**Files (deleted):**
- `src/app/(dashboard)/owner/my-training/calendar/page.tsx`
- `src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx`
- `src/app/(dashboard)/trainer/my-training/calendar/page.tsx`
- `src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx`
- `src/components/self-tracking/my-training-calendar-client.tsx`
- `src/components/self-tracking/my-nutrition-calendar-client.tsx`

- [ ] **Step 6.1.1: Delete the calendar route page directories**

```bash
rm -rf src/app/\(dashboard\)/owner/my-training/calendar
rm -rf src/app/\(dashboard\)/owner/my-nutrition/calendar
rm -rf src/app/\(dashboard\)/trainer/my-training/calendar
rm -rf src/app/\(dashboard\)/trainer/my-nutrition/calendar
```

- [ ] **Step 6.1.2: Delete the calendar client components**

```bash
rm src/components/self-tracking/my-training-calendar-client.tsx
rm src/components/self-tracking/my-nutrition-calendar-client.tsx
```

- [ ] **Step 6.1.3: Verify no dangling imports**

```bash
grep -rn "my-nutrition-calendar-client\|my-training-calendar-client\|/my-nutrition/calendar\|/my-training/calendar" src 2>/dev/null
```
Expected: no output (or only comments referencing the deleted route in docs).

- [ ] **Step 6.1.4: Build + test + lint + commit**

```bash
pnpm lint
pnpm build 2>&1 | tail -15
pnpm test 2>&1 | tail -5
git add -A
git commit -m "refactor(self-tracking): remove old standalone /calendar routes"
```

---

## Stage 7 — E2E spec updates

### Task 7.1: `trainer-freestyle-workout.spec.ts`

**Files:**
- Modify: `e2e/self-tracking/trainer-freestyle-workout.spec.ts`

The current spec finishes a workout and expects redirect to `/trainer/my-training/calendar`. That route no longer exists. After Stage 5+6, finishing the workout returns the user to `/trainer/my-training` (the start card page) — verify the dialog `onCompleted` callback in `complete-workout-dialog.tsx` matches the new behavior.

Actually `CompleteWorkoutDialog` calls `onCompleted` and `SelfWorkoutSession` passes `onCompleted={() => router.push(\`${basePath}/calendar\`)}`. We need to also update `SelfWorkoutSession` to push to `${basePath}` instead.

- [ ] **Step 7.1.1: Update `SelfWorkoutSession` redirect**

In `src/components/self-tracking/self-workout-session.tsx`, find:

```tsx
onCompleted={() => router.push(`${basePath}/calendar`)}
```

Replace with:

```tsx
onCompleted={() => router.push(basePath)}
```

- [ ] **Step 7.1.2: Update the spec**

In `e2e/self-tracking/trainer-freestyle-workout.spec.ts`:

Find:
```ts
    await page.waitForURL(/\/trainer\/my-training\/calendar/);
    // Calendar page loaded — PageHeader renders <h1>Training Calendar</h1>.
```

Replace with:
```ts
    await page.waitForURL(/\/trainer\/my-training$/);
    // Returned to start card page; entry card now shows "From Template / Freestyle" or "Continue".
    await expect(page.getByRole('heading', { name: /^my training$/i })).toBeVisible();
```

Also update the comment header at top of the spec file referring to step 5 about `onCompleted navigates to /trainer/my-training/calendar` — change to `/trainer/my-training`.

- [ ] **Step 7.1.3: Run spec**

```bash
pnpm test:e2e -- e2e/self-tracking/trainer-freestyle-workout.spec.ts 2>&1 | tail -20
```

- [ ] **Step 7.1.4: Commit**

```bash
git add src/components/self-tracking/self-workout-session.tsx e2e/self-tracking/trainer-freestyle-workout.spec.ts
git commit -m "test(self-tracking): update freestyle e2e for popover-based calendar"
```

---

### Task 7.2: `trainer-template-workout.spec.ts`

**Files:**
- Modify: `e2e/self-tracking/trainer-template-workout.spec.ts`

Same pattern.

- [ ] **Step 7.2.1: Find and replace**

In `e2e/self-tracking/trainer-template-workout.spec.ts`, find:
```ts
    await page.waitForURL(/\/trainer\/my-training\/calendar/);
```

Replace with:
```ts
    await page.waitForURL(/\/trainer\/my-training$/);
```

If there's also any `Training Calendar` text assertion afterwards, replace with `My Training` (or remove if redundant).

- [ ] **Step 7.2.2: Run spec**

```bash
pnpm test:e2e -- e2e/self-tracking/trainer-template-workout.spec.ts 2>&1 | tail -20
```

- [ ] **Step 7.2.3: Commit**

```bash
git add e2e/self-tracking/trainer-template-workout.spec.ts
git commit -m "test(self-tracking): update template e2e for popover-based calendar"
```

---

### Task 7.3: `owner-nutrition-day.spec.ts` — add Mark day complete verification

**Files:**
- Modify: `e2e/self-tracking/owner-nutrition-day.spec.ts`

- [ ] **Step 7.3.1: Add a new test**

Append a new test inside the existing `describe` block:

```ts
test('owner can Mark day complete and the button transitions to disabled', async ({ page }) => {
  await page.goto('/owner/my-nutrition');

  // Click Mark day complete
  const markBtn = page.getByRole('button', { name: /^mark day complete$/i });
  await expect(markBtn).toBeVisible();
  await markBtn.click();

  // After PUT, button should swap to disabled "Day completed ✓"
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeDisabled();
});
```

> Note: this test depends on the `beforeEach` having already seeded a log for the date. The existing spec does that. If `Mark day complete` button is hidden because the `dayCompleted` is already true from a previous test run, the `afterAll` cleanup `await request.delete(\`/api/me/nutrition-logs/${TEST_DATE}\`)` should handle it. Verify by running the test fresh.

- [ ] **Step 7.3.2: Run + commit**

```bash
pnpm test:e2e -- e2e/self-tracking/owner-nutrition-day.spec.ts 2>&1 | tail -20
git add e2e/self-tracking/owner-nutrition-day.spec.ts
git commit -m "test(self-tracking): add Mark day complete e2e verification"
```

---

## Stage 8 — Final smoke

### Task 8.1: Full verification + INDEX.md update

- [ ] **Step 8.1.1: Run full verification**

```bash
pnpm test 2>&1 | tail -8
pnpm lint 2>&1 | tail -5
pnpm build 2>&1 | tail -25
pnpm test:e2e -- e2e/self-tracking 2>&1 | tail -10
```

Expected:
- Jest: all passing (no regressions; should be ~1006-1008 tests)
- Lint: 0 warnings
- Build: clean, the 4 deleted `/calendar` routes are GONE from the build output
- E2E: 4 specs / ~5 tests passing

- [ ] **Step 8.1.2: Update `docs/INDEX.md`**

Promote the design doc from `Approved` → keep as `Approved`. Implementation plan (this file) gets removed per CLAUDE.md hygiene.

Edit `docs/INDEX.md`:
- Implementation plan row should not exist (this plan was never added; if it was, remove it)
- Specs & Designs section: ensure `Self-Tracking Calendar Popover Refactor | [my-nutrition-refactor-design.md] | Approved` exists. If status is still `Draft` from when first added, change to `Approved`.

Also: design header should match. Verify `docs/2026-05-08/plans/my-nutrition-refactor-design.md` line 3 says `**状态**：Approved`. If still `Draft`, update.

- [ ] **Step 8.1.3: Delete this implementation plan file**

```bash
rm docs/2026-05-08/plans/calendar-popover-refactor-implementation-plan.md
```

- [ ] **Step 8.1.4: Final commit**

```bash
git add docs/INDEX.md docs/2026-05-08/plans/my-nutrition-refactor-design.md
git status   # confirm only doc changes remain (implementation plan deletion + index update)
git commit -m "docs(self-tracking): mark calendar popover refactor approved; remove implementation plan"
```

- [ ] **Step 8.1.5: Manual smoke checklist**

Use the checklist from the spec ("设计 ⑥ — 测试 + E2E" → "验证 checklist") to walk through manually if dev server is up.

---

## Self-Review Checklist (mapping spec sections to tasks)

| Spec section | Task |
|---|---|
| 设计 ① — File deletions + creations | Stage 6 (deletions); various stages (creations) |
| 设计 ② — Two nutrition triggers, one training trigger | Task 3.2 (date trigger); Task 5.1+5.2 (header trigger) |
| 设计 ③ — DayCompleteBar at bottom; no MealSection changes | Task 3.1 (component); Task 3.2 (integration) |
| 设计 ④ — Cell visual three states + 36×44 size | Task 1.2 (nutrition); Task 1.3 (workout) |
| 设计 ⑤ — PageHeader trigger via client wrapper; URL query source of truth | Task 4.1, 4.2, 5.1, 5.2 |
| 设计 ⑥ — Two new tests + E2E updates | Task 2.1 (popover test), Task 3.2 (day-view test); Task 7.1, 7.2, 7.3 (E2E) |
| `dayCompleted` no auto-rollback (declared) | Task 3.1 (button disabled when true; no auto-toggle elsewhere) |
| Save as template not in sticky bar (above it) | Task 3.2 (component order in JSX) |
