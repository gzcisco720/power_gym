# UI/UX Comprehensive Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the entire POWER_GYM platform to a Premium Dark aesthetic with Indigo Primary colour, glassmorphism surfaces, Rich Motion spring animations, Slide Horizontal page transitions, and 6 Expressive celebration moments.

**Architecture:** 4 phases on branch `feat/ui-ux-upgrade`. Phase 1 lays the token + animation foundation. Phase 2 upgrades shared components so every page benefits automatically. Phases 3–4 add stagger animations to each domain and wire up Expressive moments. Zero API/model changes throughout.

**Tech Stack:** Next.js App Router, Framer Motion (already installed), Tailwind v4 (CSS-variable-based config in `globals.css`), Shadcn/ui, TypeScript strict.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| **Create** | `src/lib/animations/variants.ts` | All spring presets + Framer Motion variant library |
| **Create** | `src/components/animations/workout-complete.tsx` | Expressive: ring fill + glow |
| **Create** | `src/components/animations/new-pr.tsx` | Expressive: bars race + badge spin |
| **Create** | `src/components/animations/check-in.tsx` | Expressive: dots light up + streak badge |
| **Create** | `src/components/animations/streak-milestone.tsx` | Expressive: big number + bars rise |
| **Create** | `src/components/animations/nutrition-day-complete.tsx` | Expressive: three macro rings fill |
| **Create** | `src/components/animations/body-test-improvement.tsx` | Expressive: before/after + diff card |
| **Modify** | `src/app/globals.css` | `--primary` → indigo oklch, add `--primary-light` |
| **Modify** | `src/components/shared/page-transition.tsx` | Replace CSS animation with Framer Motion slide |
| **Modify** | `src/components/shared/app-shell.tsx` | Nav active: white → indigo |
| **Modify** | `src/components/shared/page-header.tsx` | Remove hardcoded hex, add motion |
| **Modify** | `src/components/shared/stat-card.tsx` | Glass surface, bouncy number |
| **Modify** | `src/components/shared/empty-state.tsx` | Remove hardcoded hex, fade-in |
| **Modify** | `src/components/shared/progress-bar.tsx` | Track colour token |
| **Modify** | `src/components/shared/set-chip.tsx` | Indigo done state |
| **Modify** | `src/components/ui/button.tsx` | Primary variant → indigo |
| **Modify** | `CLAUDE.md` | Update design guidelines to Indigo Premium |
| **Modify** | Domain list/page files (×12) | Add stagger animation |
| **Modify** | Trigger components (×6) | Wire Expressive animations |

---

## Phase 1 — Foundation Layer

### Task 1: Update primary colour token to Indigo

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `--primary` and add `--primary-light` in the CSS theme**

In `src/app/globals.css`, find the `:root` block (starts around line 47 with `--background: oklch(0.04 0 0)`) and change:

```css
/* BEFORE */
--primary: oklch(1 0 0);
--primary-foreground: oklch(0 0 0);
```

```css
/* AFTER */
--primary: oklch(0.585 0.233 277.1);      /* #6366f1  indigo-500 */
--primary-foreground: oklch(1 0 0);        /* white text on indigo */
--primary-light: oklch(0.746 0.161 277.1); /* #a5b4fc  indigo-300 */
```

Also add to the `@theme inline` block (after `--color-primary-foreground: var(--primary-foreground);`):

```css
--color-primary-light: var(--primary-light);
```

- [ ] **Step 2: Run lint + build to verify no token errors**

```bash
pnpm lint && pnpm build
```

Expected: clean (no errors related to unknown colours).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(tokens): update --primary to indigo-500, add --primary-light"
```

---

### Task 2: Create animation variants library

**Files:**
- Create: `src/lib/animations/variants.ts`
- Create: `__tests__/lib/animations/variants.test.ts`

- [ ] **Step 1: Write the test first**

Create `__tests__/lib/animations/variants.test.ts`:

```ts
import { springs, variants } from '@/lib/animations/variants';

describe('springs', () => {
  it('exports default spring with stiffness 300', () => {
    expect(springs.default).toEqual({ type: 'spring', stiffness: 300, damping: 30 });
  });
  it('exports bouncy spring with stiffness 400', () => {
    expect(springs.bouncy).toEqual({ type: 'spring', stiffness: 400, damping: 18 });
  });
  it('exports snappy spring with stiffness 600', () => {
    expect(springs.snappy).toEqual({ type: 'spring', stiffness: 600, damping: 35 });
  });
});

describe('variants', () => {
  it('fadeSlideUp hidden state has opacity 0 and y 12', () => {
    expect(variants.fadeSlideUp.hidden).toMatchObject({ opacity: 0, y: 12 });
  });
  it('staggerContainer visible state has staggerChildren 0.06', () => {
    expect(variants.staggerContainer.visible).toMatchObject({
      transition: { staggerChildren: 0.06 },
    });
  });
  it('scaleIn hidden state has scale 0.85', () => {
    expect(variants.scaleIn.hidden).toMatchObject({ scale: 0.85 });
  });
  it('pageEnter starts at x 100%', () => {
    expect(variants.pageEnter).toMatchObject({ x: '100%' });
  });
  it('pageExit ends at x -25%', () => {
    expect(variants.pageExit).toMatchObject({ x: '-25%' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=variants
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the variants file**

Create `src/lib/animations/variants.ts`:

```ts
import type { Variants } from 'framer-motion';

export const springs = {
  default: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy:  { type: 'spring' as const, stiffness: 400, damping: 18 },
  snappy:  { type: 'spring' as const, stiffness: 600, damping: 35 },
} as const;

export const variants = {
  fadeSlideUp: {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0,  transition: springs.default },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
  } satisfies Variants,

  staggerContainer: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06 } },
  } satisfies Variants,

  staggerItem: {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0,  transition: springs.default },
  } satisfies Variants,

  scaleIn: {
    hidden:  { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1,   transition: springs.bouncy },
    exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
  } satisfies Variants,

  pageEnter:   { opacity: 0,  x: '100%' },
  pageVisible: { opacity: 1,  x: 0,      transition: { type: 'spring' as const, stiffness: 300, damping: 30, duration: 0.35 } },
  pageExit:    { opacity: 0,  x: '-25%', transition: { duration: 0.2, ease: 'easeIn' as const } },
} as const;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=variants
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/animations/variants.ts __tests__/lib/animations/variants.test.ts
git commit -m "feat(animations): add spring presets and variant library"
```

---

### Task 3: Replace PageTransition with Framer Motion Slide Horizontal

**Files:**
- Modify: `src/components/shared/page-transition.tsx`
- Modify: `__tests__/components/shared/page-transition.test.tsx` (if exists, update; otherwise skip)

- [ ] **Step 1: Rewrite `page-transition.tsx`**

Replace the entire file content:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="pageEnter"
        animate="pageVisible"
        exit="pageExit"
        variants={variants}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 3: Start dev server and verify transition plays**

```bash
pnpm dev
```

Navigate between any two pages in the browser. Expected: new page slides in from the right (~350ms), old page slides left while fading (~200ms).

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/page-transition.tsx
git commit -m "feat(animation): replace CSS page transition with Framer Motion slide horizontal"
```

---

### Task 4: Update sidebar nav active state to indigo

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 1: Find and update the active nav item class**

In `src/components/shared/app-shell.tsx`, find the `isActive` ternary (around line where `'bg-white text-black'` appears):

```tsx
/* BEFORE */
isActive(item)
  ? 'bg-white text-black'
  : 'text-[#666] hover:bg-[#141414] hover:text-[#aaa]'
```

```tsx
/* AFTER */
isActive(item)
  ? 'bg-primary/15 text-primary-light ring-1 ring-primary/25'
  : 'text-foreground/40 hover:bg-white/[.04] hover:text-foreground/70'
```

Also find the logo/brand text block and update the "role portal" subtitle:

```tsx
/* BEFORE */
<div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#777]">
```

```tsx
/* AFTER */
<div className="mt-1 text-[9px] uppercase tracking-[1px] text-foreground/40">
```

And the nav group label (find `text-[#333]` or similar dim label):
```tsx
/* Find any remaining text-[#xxx] in the nav section and replace with text-foreground/25 */
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

Expected: all pass.

- [ ] **Step 3: Verify visually in browser** — active nav item should show indigo highlight.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/app-shell.tsx
git commit -m "feat(nav): update active state to indigo primary, replace hardcoded hex"
```

---

### Task 5: Update CLAUDE.md design guidelines

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the color tokens table in the Design Guidelines section**

Find the colour token table that starts with `| Use | For | Why not the alternative |` and add a new row + update the existing primary colour references:

Add before the table or as a new subsection:

```markdown
**Primary accent** — `bg-primary` / `text-primary-light`

The primary accent colour is **indigo** (`oklch(0.585 0.233 277.1)` / `#6366f1`). Use `bg-primary` for primary buttons, active states, and icon container gradients. Use `text-primary-light` (`#a5b4fc`) for glow text and badge labels. **Emerald is now the success/completion colour only** — do not use it as the main brand colour.
```

Update the table row for `bg-primary` to use indigo context, and add a row for emerald's new role.

- [ ] **Step 2: Add animation quick-reference section**

After the color tokens section, add:

```markdown
### Animation tokens

All Framer Motion config lives in `src/lib/animations/variants.ts`. Import from there — never define inline spring configs.

| Variant | Use |
|---|---|
| `variants.fadeSlideUp` | Page-level content entry |
| `variants.staggerContainer` + `variants.staggerItem` | List/grid entries |
| `variants.scaleIn` | Badges, dialogs, toasts |
| `springs.bouncy` | Stat numbers, checkmarks |
| `springs.snappy` | Button press feedback |

Page transitions are handled automatically by `PageTransition` in the dashboard layout.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): update design guidelines to Indigo Premium + animation tokens"
```

---

## Phase 2 — Shared Component Library

### Task 6: Upgrade PageHeader

**Files:**
- Modify: `src/components/shared/page-header.tsx`

- [ ] **Step 1: Write the updated component**

Replace entire file:

```tsx
'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-8 sm:py-5">
      <motion.div
        variants={variants.fadeSlideUp}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-[18px] font-bold tracking-[-0.3px] text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-foreground/65">{subtitle}</p>
        )}
      </motion.div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/page-header.tsx
git commit -m "feat(ui): upgrade PageHeader — remove hardcoded hex, add fade-slide-up motion"
```

---

### Task 7: Upgrade StatCard

**Files:**
- Modify: `src/components/shared/stat-card.tsx`

- [ ] **Step 1: Write the updated component**

Replace entire file:

```tsx
'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  accentColor?: 'primary' | 'success' | 'achievement';
}

const accentMap = {
  primary:     'bg-primary/10 ring-primary/20',
  success:     'bg-emerald-500/10 ring-emerald-500/20',
  achievement: 'bg-amber-500/10 ring-amber-500/20',
} as const;

export function StatCard({ label, value, unit, delta, accentColor }: StatCardProps) {
  const surfaceClass = accentColor
    ? accentMap[accentColor]
    : 'bg-white/[.04] ring-white/10';

  return (
    <div className={`rounded-xl ring-1 backdrop-blur-sm p-4 ${surfaceClass}`}>
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
        {label}
      </div>
      <motion.div
        className="mt-2 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums"
        variants={variants.scaleIn}
        initial="hidden"
        animate="visible"
      >
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-foreground/65">{unit}</span>
        )}
      </motion.div>
      {delta && (
        <div className="mt-1.5 text-xs text-foreground/65">{delta}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Find and update all existing `StatCard` call sites that use the old props**

```bash
grep -r "StatCard" src --include="*.tsx" -l
```

Check each file — the component is backwards-compatible (new `accentColor` prop is optional). No call site changes needed unless they pass unexpected props.

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/stat-card.tsx
git commit -m "feat(ui): upgrade StatCard — glass surface, accentColor prop, bouncy number animation"
```

---

### Task 8: Upgrade EmptyState

**Files:**
- Modify: `src/components/shared/empty-state.tsx`

- [ ] **Step 1: Write the updated component**

Replace entire file:

```tsx
'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  heading: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 text-center"
      variants={variants.fadeSlideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-3 text-[15px] font-semibold text-foreground">{heading}</div>
      <div className="mb-6 max-w-sm text-[13px] text-foreground/65">{description}</div>
      {action}
    </motion.div>
  );
}
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/empty-state.tsx
git commit -m "feat(ui): upgrade EmptyState — remove hardcoded hex, add fade-in motion"
```

---

### Task 9: Upgrade ProgressBar track colour and SetChip done state

**Files:**
- Modify: `src/components/shared/progress-bar.tsx`
- Modify: `src/components/shared/set-chip.tsx`

- [ ] **Step 1: Update ProgressBar track and fill colours**

In `src/components/shared/progress-bar.tsx`, change:

```tsx
/* BEFORE */
className="h-[3px] w-full overflow-hidden rounded-full bg-[#141414]"
...
className="h-full rounded-full bg-white"
```

```tsx
/* AFTER */
className="h-[3px] w-full overflow-hidden rounded-full bg-white/[.06]"
...
className="h-full rounded-full bg-emerald-500"
```

- [ ] **Step 2: Update SetChip done state to indigo**

In `src/components/shared/set-chip.tsx`, change the done class:

```tsx
/* BEFORE */
done
  ? 'border-white bg-white text-black'
  : 'border-[#1e1e1e] bg-transparent text-[#555] hover:border-[#333]'
```

```tsx
/* AFTER */
done
  ? 'border-primary bg-primary text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
  : 'border-white/10 bg-transparent text-foreground/35 hover:border-white/20'
```

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/progress-bar.tsx src/components/shared/set-chip.tsx
git commit -m "feat(ui): update ProgressBar fill to emerald, SetChip done state to indigo"
```

---

### Task 10: Upgrade Button primary variant

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Find the primary variant style**

Open `src/components/ui/button.tsx` and find the `variants` definition (it uses `cva`). Locate the `primary` variant and update:

```tsx
/* BEFORE — something like: */
primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
```

```tsx
/* AFTER */
primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 shadow-[0_0_0_0_rgba(99,102,241,0)] hover:shadow-[0_0_16px_rgba(99,102,241,0.25)] transition-shadow',
```

Also find the `destructive` variant and ensure it already uses `bg-destructive` (it should — leave it if so).

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): add indigo glow on primary Button hover/focus"
```

---

## Phase 3 — Core Feature Domains

### Task 11: Stagger animate My Training landing stat cards + activity strip

**Files:**
- Modify: `src/components/self-tracking/my-training-landing.tsx`

- [ ] **Step 1: Find and wrap the stat cards section**

Open `src/components/self-tracking/my-training-landing.tsx`. Find the section that renders the 3–4 stat cards (streak, sessions, PR etc.) and wrap with stagger:

```tsx
/* Add import at top */
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

/* Wrap stat card grid */
<motion.div
  className="grid grid-cols-3 gap-3"  /* keep existing className */
  variants={variants.staggerContainer}
  initial="hidden"
  animate="visible"
>
  {/* each StatCard becomes: */}
  <motion.div variants={variants.staggerItem}>
    <StatCard ... />
  </motion.div>
  {/* repeat for each card */}
</motion.div>
```

Also wrap the path cards (TemplatePathCard, FreestylePathCard) section:

```tsx
<motion.div
  className="space-y-3"  /* keep existing className */
  variants={variants.staggerContainer}
  initial="hidden"
  animate="visible"
>
  <motion.div variants={variants.staggerItem}><TemplatePathCard ... /></motion.div>
  <motion.div variants={variants.staggerItem}><FreestylePathCard ... /></motion.div>
</motion.div>
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/self-tracking/my-training-landing.tsx
git commit -m "feat(animation): stagger stat cards and path cards on My Training landing"
```

---

### Task 12: Stagger animate Session Logger exercise rows

**Files:**
- Modify: `src/components/training/exercise-row.tsx` (or whichever component renders the exercise list — verify by checking `src/app/(dashboard)/*/session/[id]/`)

- [ ] **Step 1: Locate the exercise list render**

```bash
grep -r "ExerciseRow\|exercise-row\|exerciseList" src/app --include="*.tsx" -l | head -5
```

Open the file that renders the list of exercises in a session. Find the `.map()` call over exercises and wrap:

```tsx
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

/* wrap the list */
<motion.div
  className="space-y-3"  /* keep existing spacing class */
  variants={variants.staggerContainer}
  initial="hidden"
  animate="visible"
>
  {exercises.map((ex) => (
    <motion.div key={ex.exerciseId} variants={variants.staggerItem}>
      <ExerciseRow exercise={ex} ... />
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add -p   # stage only the changed session/exercise list file
git commit -m "feat(animation): stagger exercise rows in Session Logger"
```

---

### Task 13: Stagger animate Nutrition template list and food list

**Files:**
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/` (nutrition template list client component)
- Modify: `src/app/(dashboard)/trainer/foods/_components/foods-list-client.tsx`

- [ ] **Step 1: Add stagger to nutrition template list**

Open the client component that renders the list of nutrition templates. Find the `.map()` and wrap:

```tsx
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

<motion.ul
  className="space-y-2"  /* keep existing */
  variants={variants.staggerContainer}
  initial="hidden"
  animate="visible"
>
  {templates.map((t) => (
    <motion.li key={t._id} variants={variants.staggerItem}>
      {/* existing card content */}
    </motion.li>
  ))}
</motion.ul>
```

- [ ] **Step 2: Apply the same pattern to `foods-list-client.tsx`**

Same stagger wrap on the foods list.

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/trainer/nutrition src/app/\(dashboard\)/trainer/foods
git commit -m "feat(animation): stagger nutrition template and food list entries"
```

---

### Task 14: Stagger animate Body Tests card grid + MacroRing animate on mount

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/` (body test list client)
- Modify: `src/components/nutrition/macro-ring.tsx`

- [ ] **Step 1: Add stagger to body test card grid**

Find the body test card grid render (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4) and wrap:

```tsx
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
  variants={variants.staggerContainer}
  initial="hidden"
  animate="visible"
>
  {tests.map((test) => (
    <motion.div key={test._id} variants={variants.staggerItem}>
      {/* existing body test card */}
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 2: Animate MacroRing SVG arc on mount**

Open `src/components/nutrition/macro-ring.tsx`. Find the SVG `<circle>` that draws the ring and add Framer Motion draw animation:

```tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/* Replace the <circle> fill arc with: */
const shouldReduce = useReducedMotion();
const circumference = 2 * Math.PI * radius; // existing calculation
const offset = circumference - (pct / 100) * circumference;

<motion.circle
  /* keep all existing props (cx, cy, r, stroke, strokeWidth, etc.) */
  strokeDasharray={circumference}
  initial={{ strokeDashoffset: circumference }}
  animate={{ strokeDashoffset: shouldReduce ? offset : offset }}
  transition={shouldReduce ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
/>
```

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members src/components/nutrition/macro-ring.tsx
git commit -m "feat(animation): stagger body test grid, animate MacroRing arc on mount"
```

---

## Phase 4 — Remaining Domains + Expressive Moments

### Task 15: Create WorkoutCompleteAnimation + NewPRAnimation

**Files:**
- Create: `src/components/animations/workout-complete.tsx`
- Create: `src/components/animations/new-pr.tsx`

- [ ] **Step 1: Create WorkoutCompleteAnimation**

Create `src/components/animations/workout-complete.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface WorkoutCompleteAnimationProps {
  onComplete?: () => void;
}

export function WorkoutCompleteAnimation({ onComplete }: WorkoutCompleteAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-4xl">💪</div>
        <div className="text-lg font-bold text-foreground">Workout Complete!</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative">
        {/* Glow pulse */}
        <motion.div
          className="absolute inset-[-12px] rounded-full bg-emerald-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.4, 1.2], opacity: [0, 0.6, 0] }}
          transition={{ delay: 0.9, duration: 0.6 }}
        />
        {/* Ring */}
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <motion.circle
            cx="36" cy="36" r="30"
            fill="none" stroke="#10b981" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 30}
            initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl">💪</div>
      </div>
      <motion.div
        className="text-lg font-bold text-foreground"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Workout Complete!
      </motion.div>
      <motion.div
        className="text-xs text-foreground/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05 }}
      >
        Great work — keep it up
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create NewPRAnimation**

Create `src/components/animations/new-pr.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NewPRAnimationProps {
  exerciseName: string;
  weightKg: number;
  previousKg?: number;
  onComplete?: () => void;
}

export function NewPRAnimation({ exerciseName, weightKg, previousKg, onComplete }: NewPRAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-3xl">🏆</div>
        <div className="text-base font-bold text-amber-400">New PR — {weightKg} kg!</div>
        <div className="text-xs text-foreground/50">{exerciseName}</div>
      </div>
    );
  }

  const prevPct = previousKg ? Math.round((previousKg / weightKg) * 85) : 70;

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      <div className="w-full space-y-2">
        <div className="text-[9px] uppercase tracking-widest text-foreground/40">{exerciseName} · 1RM Estimate</div>
        {previousKg && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-white/[.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/30"
                initial={{ width: 0 }}
                animate={{ width: `${prevPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="text-[10px] text-foreground/30 min-w-[48px] text-right">{previousKg} kg</div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[5px] bg-white/[.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="text-[10px] text-amber-400 font-bold min-w-[48px] text-right">{weightKg} kg ★</div>
        </div>
      </div>
      <motion.div
        className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-400 text-sm font-bold"
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 400, damping: 18 }}
      >
        🏆 New PR{previousKg ? ` +${weightKg - previousKg} kg` : ''}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/animations/workout-complete.tsx src/components/animations/new-pr.tsx
git commit -m "feat(animation): add WorkoutCompleteAnimation and NewPRAnimation components"
```

---

### Task 16: Create CheckInAnimation + StreakMilestoneAnimation

**Files:**
- Create: `src/components/animations/check-in.tsx`
- Create: `src/components/animations/streak-milestone.tsx`

- [ ] **Step 1: Create CheckInAnimation**

Create `src/components/animations/check-in.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface CheckInAnimationProps {
  streakDays: number;
  weekDots: boolean[]; // 7 booleans, true = checked in that day
  onComplete?: () => void;
}

export function CheckInAnimation({ streakDays, weekDots, onComplete }: CheckInAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-sm font-bold text-foreground">Checked in ✓</div>
        {streakDays > 0 && <div className="text-xs text-emerald-400">🔥 {streakDays}-day streak</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-1.5">
        {weekDots.map((done, i) => (
          <motion.div
            key={i}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
              done ? 'bg-emerald-500 text-white' : 'bg-white/[.06] border border-white/10 text-foreground/20'
            }`}
            initial={{ scale: 0.6, opacity: 0.3 }}
            animate={done ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 400, damping: 18 }}
          >
            {done ? '✓' : ''}
          </motion.div>
        ))}
      </div>
      <motion.div
        className="text-sm font-bold text-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Checked in ✓
      </motion.div>
      {streakDays > 0 && (
        <motion.div
          className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-bold text-emerald-400"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: 'spring', stiffness: 400, damping: 18 }}
        >
          🔥 {streakDays}-day streak
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create StreakMilestoneAnimation**

Create `src/components/animations/streak-milestone.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface StreakMilestoneAnimationProps {
  days: number;
  onComplete?: () => void;
}

const BAR_COUNT = 7;

export function StreakMilestoneAnimation({ days, onComplete }: StreakMilestoneAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-1 py-4">
        <div className="text-4xl font-extrabold tracking-tighter text-amber-400">{days}</div>
        <div className="text-[10px] uppercase tracking-widest text-foreground/40">day streak</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 relative">
      <motion.div
        className="absolute right-4 top-2 text-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 20 }}
      >
        🔥
      </motion.div>
      <motion.div
        className="text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-amber-400 to-red-500 bg-clip-text text-transparent"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {days}
      </motion.div>
      <motion.div
        className="text-[10px] uppercase tracking-[3px] text-foreground/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        day streak
      </motion.div>
      <div className="flex gap-1 mt-1">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 w-7 h-4 rounded bg-gradient-to-b from-amber-400 to-red-500"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            style={{ transformOrigin: 'bottom' }}
            transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/animations/check-in.tsx src/components/animations/streak-milestone.tsx
git commit -m "feat(animation): add CheckInAnimation and StreakMilestoneAnimation components"
```

---

### Task 17: Create NutritionDayCompleteAnimation + BodyTestImprovementAnimation

**Files:**
- Create: `src/components/animations/nutrition-day-complete.tsx`
- Create: `src/components/animations/body-test-improvement.tsx`

- [ ] **Step 1: Create NutritionDayCompleteAnimation**

Create `src/components/animations/nutrition-day-complete.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NutritionDayCompleteAnimationProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  onComplete?: () => void;
}

const RADIUS = [26, 20, 14] as const;
const COLORS = ['#10b981', '#f59e0b', '#ec4899'] as const;
const LABELS = ['P', 'C', 'F'] as const;

export function NutritionDayCompleteAnimation({
  proteinG, carbsG, fatG, onComplete,
}: NutritionDayCompleteAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const values = [proteinG, carbsG, fatG];

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-sm font-bold text-foreground">Day Complete ✓</div>
        <div className="flex gap-2 text-xs">
          <span className="text-emerald-400">P {proteinG}g</span>
          <span className="text-amber-400">C {carbsG}g</span>
          <span className="text-pink-400">F {fatG}g</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          {RADIUS.map((r, i) => {
            const circ = 2 * Math.PI * r;
            return (
              <motion.circle
                key={i}
                cx="32" cy="32" r={r}
                fill="none" stroke={COLORS[i]} strokeWidth={i === 0 ? 5 : i === 1 ? 4 : 3.5}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base">✓</div>
      </div>
      <motion.div
        className="text-sm font-bold text-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Day Complete
      </motion.div>
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 }}
      >
        {LABELS.map((lbl, i) => (
          <span
            key={lbl}
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ background: `${COLORS[i]}20`, color: COLORS[i], border: `1px solid ${COLORS[i]}40` }}
          >
            {lbl} {values[i]}g
          </span>
        ))}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create BodyTestImprovementAnimation**

Create `src/components/animations/body-test-improvement.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface BodyTestImprovementAnimationProps {
  metricLabel: string;   // e.g. "Body Fat %"
  previousValue: string; // e.g. "15.2%"
  currentValue: string;  // e.g. "12.3%"
  diffLabel: string;     // e.g. "↓ 2.9% reduced"
  onComplete?: () => void;
}

export function BodyTestImprovementAnimation({
  metricLabel, previousValue, currentValue, diffLabel, onComplete,
}: BodyTestImprovementAnimationProps) {
  const shouldReduce = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onComplete?.(), shouldReduce ? 0 : 1800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onComplete, shouldReduce]);

  if (shouldReduce) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-xs text-foreground/50">{metricLabel}</div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-foreground/40">{previousValue}</span>
          <span className="text-foreground/40">→</span>
          <span className="text-emerald-400">{currentValue}</span>
        </div>
        <div className="text-xs text-emerald-400 font-bold">{diffLabel}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="text-[9px] uppercase tracking-widest text-foreground/40">{metricLabel}</div>
      <div className="flex items-center gap-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="text-xl font-bold tracking-tight text-foreground/30">{previousValue}</div>
          <div className="text-[8px] uppercase tracking-wide text-foreground/25 mt-0.5">before</div>
        </motion.div>
        <motion.div
          className="text-emerald-400 text-xl"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 18 }}
        >
          →
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.35 }}
        >
          <div className="text-xl font-bold tracking-tight text-emerald-400">{currentValue}</div>
          <div className="text-[8px] uppercase tracking-wide text-foreground/25 mt-0.5">today</div>
        </motion.div>
      </div>
      <motion.div
        className="bg-emerald-500/12 border border-emerald-500/25 rounded-lg px-4 py-2 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="text-sm font-bold text-emerald-400">{diffLabel}</div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/animations/nutrition-day-complete.tsx src/components/animations/body-test-improvement.tsx
git commit -m "feat(animation): add NutritionDayCompleteAnimation and BodyTestImprovementAnimation components"
```

---

### Task 18: Wire WorkoutCompleteAnimation into session complete dialogs

**Files:**
- Modify: `src/components/training/workout-complete-modal.tsx`
- Modify: `src/components/self-tracking/complete-workout-dialog.tsx`

- [ ] **Step 1: Wire into `workout-complete-modal.tsx` (member session)**

Add a brief animation phase before the RPE/note form. Add a `phase` state:

```tsx
import { WorkoutCompleteAnimation } from '@/components/animations/workout-complete';

/* inside the component, add state: */
const [showAnimation, setShowAnimation] = useState(true);

/* conditionally render: */
if (showAnimation) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md p-6">
        <WorkoutCompleteAnimation onComplete={() => setShowAnimation(false)} />
      </div>
    </div>
  );
}
/* existing return (RPE form) follows unchanged */
```

- [ ] **Step 2: Wire into `complete-workout-dialog.tsx` (self-tracking)**

Same pattern — add `showAnimation` state, render `WorkoutCompleteAnimation` before the form:

```tsx
import { WorkoutCompleteAnimation } from '@/components/animations/workout-complete';

const [showAnimation, setShowAnimation] = useState(true);

/* inside DialogContent, at the top: */
{showAnimation && (
  <WorkoutCompleteAnimation onComplete={() => setShowAnimation(false)} />
)}
{!showAnimation && (
  /* existing form content */
)}
```

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/training/workout-complete-modal.tsx src/components/self-tracking/complete-workout-dialog.tsx
git commit -m "feat(animation): wire WorkoutCompleteAnimation into session complete dialogs"
```

---

### Task 19: Wire CheckInAnimation + StreakMilestoneAnimation

**Files:**
- Modify: `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`

- [ ] **Step 1: Find the submit success handler**

Open `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`. Find where a successful check-in submission is handled (after the API call returns 200). Add state:

```tsx
import { CheckInAnimation } from '@/components/animations/check-in';
import { StreakMilestoneAnimation } from '@/components/animations/streak-milestone';

/* Add state */
const [celebration, setCelebration] = useState<'check-in' | 'milestone' | null>(null);
const [celebrationData, setCelebrationData] = useState<{
  streakDays: number; weekDots: boolean[];
} | null>(null);

/* After successful API response: */
const MILESTONES = [7, 14, 30, 60, 100];
const streakDays = /* extract from API response */ data.streakDays ?? 0;
const weekDots = /* extract from API response */ data.weekDots ?? Array(7).fill(false);

if (MILESTONES.includes(streakDays)) {
  setCelebration('milestone');
} else {
  setCelebration('check-in');
}
setCelebrationData({ streakDays, weekDots });
```

Show the animation overlay:

```tsx
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
```

Note: If the check-in API response does not currently return `streakDays`/`weekDots`, calculate them client-side from the already-known submission date and any existing week data passed as props.

- [ ] **Step 2: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/check-in
git commit -m "feat(animation): wire CheckInAnimation and StreakMilestoneAnimation to check-in submit"
```

---

### Task 20: Wire NutritionDayCompleteAnimation + BodyTestImprovementAnimation

**Files:**
- Modify: `src/components/self-tracking/day-complete-confirm-dialog.tsx`
- Modify: Body test result page/component (find with `grep -r "bodyFat\|body_fat\|BF%" src/app --include="*.tsx" -l`)

- [ ] **Step 1: Wire NutritionDayCompleteAnimation into DayCompleteConfirmDialog**

Open `src/components/self-tracking/day-complete-confirm-dialog.tsx`. Find the `onConfirm`/submit handler. After successful `PATCH` response, show the animation:

```tsx
import { NutritionDayCompleteAnimation } from '@/components/animations/nutrition-day-complete';

const [showCelebration, setShowCelebration] = useState(false);

/* After PATCH success: */
setShowCelebration(true);

/* In JSX, inside the Dialog: */
{showCelebration && (
  <NutritionDayCompleteAnimation
    proteinG={sealedProtein}  // from existing sealed macros calculation
    carbsG={sealedCarbs}
    fatG={sealedFat}
    onComplete={() => { setShowCelebration(false); onClose(); }}
  />
)}
```

- [ ] **Step 2: Wire BodyTestImprovementAnimation into body test result display**

```bash
grep -r "bodyFat\|latestBf\|bf_pct" src/app --include="*.tsx" -l | head -5
```

Find the body test viewer/result component. After a new body test is saved and the result is better than previous, render the animation as an overlay using the same pattern.

- [ ] **Step 3: Run tests + lint**

```bash
pnpm test && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/self-tracking/day-complete-confirm-dialog.tsx
git commit -m "feat(animation): wire NutritionDayComplete and BodyTestImprovement Expressive animations"
```

---

### Task 21: Stagger remaining domains (Calendar, Equipment, Progress, Settings)

**Files:**
- Modify: `src/components/calendar/week-calendar-grid.tsx`
- Modify: `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx`
- Modify: `src/app/(dashboard)/*/progress/` (progress page components)
- Modify: `src/components/settings/` (settings tab content)

- [ ] **Step 1: Calendar — stagger session event blocks on week load**

In `src/components/calendar/week-calendar-grid.tsx`, find where session events are rendered and wrap with staggerContainer + staggerItem (same pattern as Task 12).

- [ ] **Step 2: Equipment — stagger equipment card grid**

In `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx`, wrap the equipment card list with stagger.

- [ ] **Step 3: Progress page — stagger heatmap rows + chart fade-in**

In the progress page component, wrap heatmap week rows in stagger. For the 1RM chart, add `variants={variants.fadeSlideUp}` to the chart container.

- [ ] **Step 4: Settings tabs — fade content on tab switch**

In `src/components/shared/settings-tabs.tsx` or wherever tab content is rendered, wrap each tab panel's content in:

```tsx
<motion.div
  key={activeTab}
  variants={variants.fadeSlideUp}
  initial="hidden"
  animate="visible"
>
  {/* tab content */}
</motion.div>
```

- [ ] **Step 5: Run full test suite + lint + build**

```bash
pnpm test && pnpm lint && pnpm build
```

Expected: all 1,227+ tests pass, 0 lint errors, build succeeds.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(animation): stagger calendar, equipment, progress, settings — Phase 4 complete"
```

---

## Phase 4 Final Verification

- [ ] Run `pnpm test` — all tests green
- [ ] Run `pnpm lint` — 0 errors, 0 warnings
- [ ] Run `pnpm build` — clean build
- [ ] Manual smoke test: navigate the app — page transitions, stat card animations, set chip indigo, sidebar indigo active
- [ ] Trigger each Expressive moment once: complete a self-tracking session, submit a check-in, mark nutrition day complete, add a body test with improvement
- [ ] Open DevTools → Accessibility → verify no new contrast violations
