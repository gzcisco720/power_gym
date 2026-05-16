# Check-In UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the member check-in page into a centered, 4-card layout with compact sliders, stat grid cells, and a dashed-border photo add slot — pure UI refactor, no logic changes.

**Architecture:** Extract the monolithic `CheckInForm` into four focused presentational sub-components (`CheckInFeelingsSection`, `CheckInStatsSection`, `CheckInDietSection`, `CheckInPhotosSection`). `CheckInForm` becomes a thin shell that owns state, submission logic, and composes the four sections. Fix the centering bug in `page.tsx` (missing `mx-auto`).

**Tech Stack:** Next.js App Router, React, TailwindCSS, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(dashboard)/member/check-in/page.tsx` | Modify | Add `mx-auto` to content container |
| `src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx` | Create | 7 sliders, single-row layout |
| `src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx` | Create | 6 stat inputs in grid cells |
| `src/app/(dashboard)/member/check-in/_components/check-in-diet-section.tsx` | Create | Diet toggle + 3 textareas |
| `src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx` | Create | Thumbnails + dashed add slot |
| `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx` | Replace | Shell composing the 4 sections |
| `__tests__/app/member/check-in/check-in-feelings-section.test.tsx` | Create | Slider render + onChange |
| `__tests__/app/member/check-in/check-in-stats-section.test.tsx` | Create | Input render + inputMode |
| `__tests__/app/member/check-in/check-in-diet-section.test.tsx` | Create | Toggle + textarea render |
| `__tests__/app/member/check-in/check-in-photos-section.test.tsx` | Create | Thumbnails + dashed slot logic |

---

## Shared Types (inline in each file — no separate types.ts needed)

```ts
// Used by CheckInFeelingsSection and CheckInForm
interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

// Used by CheckInStatsSection and CheckInForm
interface StatValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}
```

---

## Task 1: Fix centering in `page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/member/check-in/page.tsx`

- [ ] **Step 1.1: Add `mx-auto` to the content container**

Change line 23 from:
```tsx
      <div className="px-4 sm:px-8 py-7 max-w-2xl">
```
to:
```tsx
      <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
```

- [ ] **Step 1.2: Run full test suite to confirm nothing breaks**

```bash
pnpm test --no-coverage
```

Expected: all tests pass

- [ ] **Step 1.3: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/page.tsx"
git commit -m "fix(check-in): center content container with mx-auto"
```

---

## Task 2: `CheckInFeelingsSection` — 7 sliders

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx`
- Create: `__tests__/app/member/check-in/check-in-feelings-section.test.tsx`

- [ ] **Step 2.1: Create test file**

```bash
mkdir -p __tests__/app/member/check-in
```

```tsx
// __tests__/app/member/check-in/check-in-feelings-section.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInFeelingsSection } from '@/app/(dashboard)/member/check-in/_components/check-in-feelings-section';

const defaultRatings = {
  sleepQuality: 7, energy: 5, recovery: 6,
  stress: 3, fatigue: 4, hunger: 5, digestion: 9,
};

describe('CheckInFeelingsSection', () => {
  it('renders all 7 rating labels', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getByText('Sleep Quality')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
    expect(screen.getByText('Stress')).toBeInTheDocument();
    expect(screen.getByText('Fatigue')).toBeInTheDocument();
    expect(screen.getByText('Hunger')).toBeInTheDocument();
    expect(screen.getByText('Digestion')).toBeInTheDocument();
  });

  it('displays current rating values', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getByText('7')).toBeInTheDocument(); // sleepQuality
    expect(screen.getByText('9')).toBeInTheDocument(); // digestion
  });

  it('calls onChange with correct key and value when slider changes', () => {
    const onChange = jest.fn();
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={onChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '8' } }); // sleepQuality slider
    expect(onChange).toHaveBeenCalledWith('sleepQuality', 8);
  });

  it('renders 7 range inputs', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getAllByRole('slider')).toHaveLength(7);
  });
});
```

- [ ] **Step 2.2: Run the test and confirm it fails**

```bash
pnpm test "__tests__/app/member/check-in/check-in-feelings-section.test.tsx"
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 2.3: Implement `CheckInFeelingsSection`**

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx
interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

const RATINGS: { key: keyof RatingFields; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

interface Props {
  ratings: RatingFields;
  onChange: (key: keyof RatingFields, value: number) => void;
}

export function CheckInFeelingsSection({ ratings, onChange }: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
        How are you feeling?
      </h3>
      <div className="space-y-3">
        {RATINGS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-[12px] text-foreground/65 w-24 shrink-0">{label}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={ratings[key]}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-[13px] font-semibold text-primary-light w-5 text-right tabular-nums">
              {ratings[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests and confirm they pass**

```bash
pnpm test "__tests__/app/member/check-in/check-in-feelings-section.test.tsx"
```

Expected: PASS — 4 tests

- [ ] **Step 2.5: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx" \
        "__tests__/app/member/check-in/check-in-feelings-section.test.tsx"
git commit -m "feat(check-in): add CheckInFeelingsSection — compact single-row sliders"
```

---

## Task 3: `CheckInStatsSection` — 6 stat grid cells

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx`
- Create: `__tests__/app/member/check-in/check-in-stats-section.test.tsx`

- [ ] **Step 3.1: Write the failing test**

```tsx
// __tests__/app/member/check-in/check-in-stats-section.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInStatsSection } from '@/app/(dashboard)/member/check-in/_components/check-in-stats-section';

const defaultValues = {
  weight: '', waist: '', steps: '',
  exerciseMinutes: '', walkRunDistance: '', sleepHours: '',
};

describe('CheckInStatsSection', () => {
  it('renders all 6 stat labels', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Waist')).toBeInTheDocument();
    expect(screen.getByText('Steps')).toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Walk / Run')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
  });

  it('renders all 6 unit labels', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('cm')).toBeInTheDocument();
    expect(screen.getByText('steps')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('hrs')).toBeInTheDocument();
  });

  it('uses text input with inputMode=decimal, not type=number', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('inputMode', 'decimal');
      expect(input).not.toHaveAttribute('type', 'number');
    });
  });

  it('calls onChange with correct field and value', () => {
    const onChange = jest.fn();
    render(<CheckInStatsSection values={defaultValues} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '72.5' } }); // weight
    expect(onChange).toHaveBeenCalledWith('weight', '72.5');
  });

  it('displays current values in inputs', () => {
    render(
      <CheckInStatsSection
        values={{ ...defaultValues, weight: '72.5', sleepHours: '7.5' }}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByDisplayValue('72.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7.5')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run the test and confirm it fails**

```bash
pnpm test "__tests__/app/member/check-in/check-in-stats-section.test.tsx"
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3.3: Implement `CheckInStatsSection`**

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx
interface StatValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}

const STAT_FIELDS: { key: keyof StatValues; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'steps', label: 'Steps', unit: 'steps' },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min' },
  { key: 'walkRunDistance', label: 'Walk / Run', unit: 'km' },
  { key: 'sleepHours', label: 'Sleep', unit: 'hrs' },
];

interface Props {
  values: StatValues;
  onChange: (field: keyof StatValues, value: string) => void;
}

export function CheckInStatsSection({ values, onChange }: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
        Body &amp; Activity
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {STAT_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="bg-white/[.03] rounded-lg p-3">
            <div className="text-[10px] text-foreground/40 mb-1">{label}</div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="—"
              className="w-full bg-transparent text-[15px] font-bold text-foreground placeholder:text-foreground/20 outline-none"
            />
            <div className="text-[10px] text-foreground/40 mt-1">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Run tests and confirm they pass**

```bash
pnpm test "__tests__/app/member/check-in/check-in-stats-section.test.tsx"
```

Expected: PASS — 5 tests

- [ ] **Step 3.5: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx" \
        "__tests__/app/member/check-in/check-in-stats-section.test.tsx"
git commit -m "feat(check-in): add CheckInStatsSection — stat grid with text inputs"
```

---

## Task 4: `CheckInDietSection` — diet toggle + 3 textareas

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-diet-section.tsx`
- Create: `__tests__/app/member/check-in/check-in-diet-section.test.tsx`

- [ ] **Step 4.1: Write the failing test**

```tsx
// __tests__/app/member/check-in/check-in-diet-section.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInDietSection } from '@/app/(dashboard)/member/check-in/_components/check-in-diet-section';

const defaultProps = {
  stuckToDiet: 'yes' as const,
  onStuckToDiet: jest.fn(),
  dietDetails: '',
  onDietDetails: jest.fn(),
  wellbeing: '',
  onWellbeing: jest.fn(),
  notes: '',
  onNotes: jest.fn(),
};

describe('CheckInDietSection', () => {
  it('renders all three diet toggle options', () => {
    render(<CheckInDietSection {...defaultProps} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls onStuckToDiet when a toggle button is clicked', () => {
    const onStuckToDiet = jest.fn();
    render(<CheckInDietSection {...defaultProps} onStuckToDiet={onStuckToDiet} />);
    fireEvent.click(screen.getByText('Partial'));
    expect(onStuckToDiet).toHaveBeenCalledWith('partial');
  });

  it('renders diet details, wellbeing, and notes textareas', () => {
    render(<CheckInDietSection {...defaultProps} />);
    expect(screen.getByPlaceholderText(/describe your diet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/how are you feeling/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/anything else/i)).toBeInTheDocument();
  });

  it('calls onDietDetails when diet textarea changes', () => {
    const onDietDetails = jest.fn();
    render(<CheckInDietSection {...defaultProps} onDietDetails={onDietDetails} />);
    fireEvent.change(screen.getByPlaceholderText(/describe your diet/i), {
      target: { value: 'Hit macros all week' },
    });
    expect(onDietDetails).toHaveBeenCalledWith('Hit macros all week');
  });

  it('displays passed-in values in textareas', () => {
    render(
      <CheckInDietSection
        {...defaultProps}
        dietDetails="Great week"
        wellbeing="Feeling good"
        notes="Nothing extra"
      />,
    );
    expect(screen.getByDisplayValue('Great week')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Feeling good')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nothing extra')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run the test and confirm it fails**

```bash
pnpm test "__tests__/app/member/check-in/check-in-diet-section.test.tsx"
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 4.3: Implement `CheckInDietSection`**

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-diet-section.tsx
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  stuckToDiet: 'yes' | 'no' | 'partial';
  onStuckToDiet: (v: 'yes' | 'no' | 'partial') => void;
  dietDetails: string;
  onDietDetails: (v: string) => void;
  wellbeing: string;
  onWellbeing: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
}

const DIET_OPTIONS = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'partial' as const, label: 'Partial' },
  { value: 'no' as const, label: 'No' },
];

export function CheckInDietSection({
  stuckToDiet, onStuckToDiet,
  dietDetails, onDietDetails,
  wellbeing, onWellbeing,
  notes, onNotes,
}: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5 space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Diet &amp; Wellbeing
      </h3>

      <div>
        <p className="text-[12px] text-foreground/65 mb-2">Stuck to diet?</p>
        <div className="flex gap-2">
          {DIET_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStuckToDiet(value)}
              className={cn(
                'rounded-md border px-4 py-2 text-[12px] font-medium transition-colors',
                stuckToDiet === value
                  ? 'border-primary bg-primary/15 text-primary-light'
                  : 'border-foreground/20 text-foreground/65 hover:border-foreground/40 hover:text-foreground/80',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        value={dietDetails}
        onChange={(e) => onDietDetails(e.target.value)}
        placeholder="Describe your diet this week..."
        rows={3}
      />

      <div className="border-t border-foreground/[.06] pt-4 space-y-4">
        <Textarea
          value={wellbeing}
          onChange={(e) => onWellbeing(e.target.value)}
          placeholder="How are you feeling overall?"
          rows={3}
        />
        <Textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Anything else to share?"
          rows={3}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: Run tests and confirm they pass**

```bash
pnpm test "__tests__/app/member/check-in/check-in-diet-section.test.tsx"
```

Expected: PASS — 5 tests

- [ ] **Step 4.5: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/_components/check-in-diet-section.tsx" \
        "__tests__/app/member/check-in/check-in-diet-section.test.tsx"
git commit -m "feat(check-in): add CheckInDietSection — diet toggle and wellbeing textareas"
```

---

## Task 5: `CheckInPhotosSection` — thumbnails + dashed add slot

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx`
- Create: `__tests__/app/member/check-in/check-in-photos-section.test.tsx`

- [ ] **Step 5.1: Write the failing test**

```tsx
// __tests__/app/member/check-in/check-in-photos-section.test.tsx
import { render, screen } from '@testing-library/react';
import { CheckInPhotosSection } from '@/app/(dashboard)/member/check-in/_components/check-in-photos-section';

describe('CheckInPhotosSection', () => {
  it('shows count badge', () => {
    render(
      <CheckInPhotosSection photos={['url1', 'url2']} uploading={false} onFileChange={jest.fn()} />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('renders an img for each uploaded photo', () => {
    render(
      <CheckInPhotosSection
        photos={['url1', 'url2', 'url3']}
        uploading={false}
        onFileChange={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('shows the dashed add slot when fewer than 5 photos', () => {
    render(
      <CheckInPhotosSection photos={['url1']} uploading={false} onFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Add photo')).toBeInTheDocument();
  });

  it('hides the dashed add slot when 5 photos are uploaded', () => {
    render(
      <CheckInPhotosSection
        photos={['u1', 'u2', 'u3', 'u4', 'u5']}
        uploading={false}
        onFileChange={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Add photo')).not.toBeInTheDocument();
  });

  it('shows a spinner instead of + when uploading', () => {
    render(
      <CheckInPhotosSection photos={[]} uploading={true} onFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Uploading...')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run the test and confirm it fails**

```bash
pnpm test "__tests__/app/member/check-in/check-in-photos-section.test.tsx"
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 5.3: Implement `CheckInPhotosSection`**

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx
import { useRef } from 'react';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  photos: string[];
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckInPhotosSection({ photos, uploading, onFileChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = photos.length < 5 && !uploading;

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Progress Photos
        </h3>
        <span className="text-[11px] text-foreground/40">{photos.length} / 5</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`Photo ${i + 1}`}
            className="w-16 h-16 rounded-lg object-cover ring-1 ring-foreground/10"
          />
        ))}

        {uploading && (
          <div
            aria-label="Uploading..."
            className="w-16 h-16 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center"
          >
            <Loader2 className="w-4 h-4 text-foreground/40 animate-spin" />
          </div>
        )}

        {canAdd && (
          <button
            type="button"
            aria-label="Add photo"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center hover:border-foreground/40 transition-colors"
          >
            <Plus className="w-4 h-4 text-foreground/30" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={!canAdd}
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests and confirm they pass**

```bash
pnpm test "__tests__/app/member/check-in/check-in-photos-section.test.tsx"
```

Expected: PASS — 5 tests

- [ ] **Step 5.5: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx" \
        "__tests__/app/member/check-in/check-in-photos-section.test.tsx"
git commit -m "feat(check-in): add CheckInPhotosSection — thumbnails with dashed add slot"
```

---

## Task 6: Refactor `CheckInForm` as shell

No new tests — all logic is unchanged, sub-components are already covered. Run full suite to verify.

**Files:**
- Replace: `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`

- [ ] **Step 6.1: Replace `check-in-form.tsx` with the shell**

Overwrite the entire file:

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckInAction, getCheckInSignatureAction } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import { CheckInAnimation } from '@/components/animations/check-in';
import { StreakMilestoneAnimation } from '@/components/animations/streak-milestone';
import { CheckInFeelingsSection } from './check-in-feelings-section';
import { CheckInStatsSection } from './check-in-stats-section';
import { CheckInDietSection } from './check-in-diet-section';
import { CheckInPhotosSection } from './check-in-photos-section';

const MILESTONES = [7, 14, 30, 60, 100];

interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

interface StatValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}

const DEFAULT_RATINGS: RatingFields = {
  sleepQuality: 5, energy: 5, recovery: 5,
  stress: 5, fatigue: 5, hunger: 5, digestion: 5,
};

interface Props {
  alreadySubmitted: boolean;
}

export function CheckInForm({ alreadySubmitted }: Props) {
  const [ratings, setRatings] = useState<RatingFields>(DEFAULT_RATINGS);
  const [stats, setStats] = useState<StatValues>({
    weight: '', waist: '', steps: '',
    exerciseMinutes: '', walkRunDistance: '', sleepHours: '',
  });
  const [dietDetails, setDietDetails] = useState('');
  const [stuckToDiet, setStuckToDiet] = useState<'yes' | 'no' | 'partial'>('yes');
  const [wellbeing, setWellbeing] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<'check-in' | 'milestone' | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    streakDays: number;
    weekDots: boolean[];
  } | null>(null);

  if (alreadySubmitted || submitted) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-6 text-center">
        <p className="text-foreground/65">You&apos;ve already submitted your check-in this week.</p>
        <p className="mt-1 text-[12px] text-foreground/40">Check back next week.</p>
      </div>
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }
    setUploadingPhotos(true);
    setError('');
    try {
      const result = await getCheckInSignatureAction();
      if (result.error) { setError(result.error); return; }
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, result.config!);
        urls.push(url);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhotos(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createCheckInAction({
        ...ratings,
        weight: stats.weight ? Number(stats.weight) : null,
        waist: stats.waist ? Number(stats.waist) : null,
        steps: stats.steps ? Number(stats.steps) : null,
        exerciseMinutes: stats.exerciseMinutes ? Number(stats.exerciseMinutes) : null,
        walkRunDistance: stats.walkRunDistance ? Number(stats.walkRunDistance) : null,
        sleepHours: stats.sleepHours ? Number(stats.sleepHours) : null,
        dietDetails,
        stuckToDiet,
        wellbeing,
        notes,
        photos,
      });
      if (result.error) {
        setError(result.error);
      } else {
        const streakDays = 0;
        const todayDow = new Date().getDay();
        const weekDots = Array.from({ length: 7 }, (_, i) => i === todayDow);
        if (MILESTONES.includes(streakDays)) {
          setCelebration('milestone');
        } else {
          setCelebration('check-in');
        }
        setCelebrationData({ streakDays, weekDots });
        setSubmitted(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CheckInFeelingsSection
        ratings={ratings}
        onChange={(key, value) => setRatings((r) => ({ ...r, [key]: value }))}
      />

      <CheckInStatsSection
        values={stats}
        onChange={(field, value) => setStats((s) => ({ ...s, [field]: value }))}
      />

      <CheckInDietSection
        stuckToDiet={stuckToDiet}
        onStuckToDiet={setStuckToDiet}
        dietDetails={dietDetails}
        onDietDetails={setDietDetails}
        wellbeing={wellbeing}
        onWellbeing={setWellbeing}
        notes={notes}
        onNotes={setNotes}
      />

      <CheckInPhotosSection
        photos={photos}
        uploading={uploadingPhotos}
        onFileChange={handlePhotoChange}
      />

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isPending || uploadingPhotos}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : 'Submit Check-In'}
      </Button>

      {celebration === 'milestone' && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <StreakMilestoneAnimation
              days={celebrationData.streakDays}
              onComplete={() => setCelebration(null)}
            />
          </div>
        </div>
      )}
      {celebration === 'check-in' && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <CheckInAnimation
              streakDays={celebrationData.streakDays}
              weekDots={celebrationData.weekDots}
              onComplete={() => setCelebration(null)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 6.2: Run the full test suite**

```bash
pnpm test --no-coverage
```

Expected: all tests pass (including the 19 new ones from Tasks 2–5)

- [ ] **Step 6.3: Run lint**

```bash
pnpm lint
```

Expected: no errors or warnings

- [ ] **Step 6.4: Commit**

```bash
git add "src/app/(dashboard)/member/check-in/_components/check-in-form.tsx"
git commit -m "feat(check-in): refactor CheckInForm as shell composing 4 card sections"
```

---

## Done

After Task 6 verify in the browser at `http://localhost:3000/member/check-in`:

- [ ] Content is centered (not pinned left)
- [ ] 4 distinct cards: How are you feeling / Body & Activity / Diet & Wellbeing / Progress Photos
- [ ] Sliders in single-row layout with value on the right
- [ ] Stats show label + input + unit, no type=number
- [ ] Photos: thumbnails + dashed `+` slot, count badge top-right of card
- [ ] `pnpm build` passes clean
