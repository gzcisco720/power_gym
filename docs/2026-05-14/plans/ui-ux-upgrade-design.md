# UI/UX Comprehensive Upgrade — Design Spec

**Date**: 2026-05-14
**Status**: Approved
**Branch**: `feat/ui-ux-upgrade`
**Scope**: All 12 feature domains — visual language + animation system, zero API/model changes

---

## Overview

A full-platform visual and motion upgrade targeting three goals:

1. **Premium Dark aesthetic** — glassmorphism surfaces, glow accents, micro-gradients
2. **Rich Motion animation system** — spring physics throughout, stagger lists, Expressive celebration moments
3. **Indigo Premium colour palette** — indigo/violet primary replacing emerald, with emerald demoted to success/completion role

This spec is the reference guideline for the current upgrade *and* for future dashboard enrichment work across all three roles.

---

## 1. Constraints & Boundaries

- **UI layer only** — zero API changes, zero data model changes, zero business logic changes
- **Existing stack** — Framer Motion (already installed), Tailwind, Shadcn/ui; no new UI libraries
- **Test gate** — `pnpm test` + `pnpm lint` + `pnpm build` must all pass green at the end of every Phase
- **Branch** — all work on `feat/ui-ux-upgrade`; merge to main only after full Phase 4 sign-off

---

## 2. Colour System — Indigo Premium

### Semantic Roles

| Role | Colour | Hex | Tailwind | Usage |
|---|---|---|---|---|
| **Primary** | Indigo | `#6366f1` | `indigo-500` | Primary buttons, active states, icon container gradients, nav highlights |
| **Primary Light** | Violet | `#a5b4fc` | `indigo-300` | Glow text, badge labels, hover highlights |
| **Success / Complete** | Emerald | `#10b981` | `emerald-500` | Completion ticks, full progress bars, positive diffs |
| **Achievement / PR** | Amber | `#f59e0b` | `amber-500` | PR badges, streak counters, milestone markers |
| **Danger** | Red | `#ef4444` | `red-500` | Delete actions, required `*`, destructive buttons |
| **Macro: Protein** | Emerald | `#10b981` | — | Unchanged |
| **Macro: Carbs** | Amber | `#f59e0b` | — | Unchanged (shared with Achievement) |
| **Macro: Fat** | Pink | `#ec4899` | `pink-500` | Unchanged |
| **Macro: kcal** | White | `rgba(255,255,255,0.85)` | — | Unchanged |

### Tailwind Config Registration

```js
// tailwind.config.ts — extend colors
colors: {
  primary: '#6366f1',
  'primary-light': '#a5b4fc',
}
```

### Glow System

```
Primary glow   (nav / main CTA):  shadow-[0_0_20px_rgba(99,102,241,0.25)]
Success glow   (complete / done):  shadow-[0_0_20px_rgba(16,185,129,0.20)]
Achievement glow (PR / streak):    shadow-[0_0_20px_rgba(245,158,11,0.20)]
Danger glow    (delete hover):     shadow-[0_0_20px_rgba(239,68,68,0.20)]
```

---

## 3. Visual Language — Premium Dark

### Surface Hierarchy (3 levels)

| Level | Usage | Token |
|---|---|---|
| **Surface 0** — page background | Deepest layer | `bg-background` (oklch 0.04, ≈ `#0a0a0a`) |
| **Surface 1** — standard card | List items, info cards | `bg-white/[.04] ring-1 ring-white/10 backdrop-blur-sm rounded-xl` |
| **Surface 2** — elevated / active card | Active item, featured card, dialog | `bg-white/[.07] ring-1 ring-white/[.15] backdrop-blur-md rounded-xl` |

### Micro-Gradient Rules

- **Icon containers**: `bg-gradient-to-br` using the domain's primary colour pair (e.g. `from-indigo-500 to-indigo-700`)
- **Body card backgrounds**: **no gradients** — flat Surface tokens only
- **Progress bars & ring charts**: gradients permitted

### Typography Upgrades

| Element | Style | Notes |
|---|---|---|
| Hero number (streak, today's count) | `text-4xl font-extrabold tracking-tighter` | New — dashboard feature cards |
| Large data value (weight, 1RM, kcal) | `font-light tracking-tight` | Replaces current `font-bold` for these specific large numerals |
| Section label | `text-[11px] uppercase tracking-wider text-foreground/65 font-semibold` | Unchanged |
| Body helper text | `text-xs text-foreground/65` | Unchanged |

### Hover / Focus Interaction

- **Card hover**: `ring-white/10 → ring-white/25` + `bg-white/[.04] → bg-white/[.06]`, `transition-all duration-150`
- **Button press**: `scale-[0.97]`, snappy spring (CSS `active:scale-[0.97]`)
- All hover/focus states use **CSS `transition`**, not Framer Motion (lighter, no JS overhead)

### Colour Rules (carry-over from CLAUDE.md, reinforced)

- `text-foreground/65` for all secondary / helper text — never `text-muted-foreground`
- Zero hardcoded hex values anywhere in production code
- Migrate any `text-[#xxx]` / `bg-[#xxx]` encountered during the upgrade

---

## 4. Animation System

### Technology

- **Framer Motion** `AnimatePresence` + `motion.*` — page transitions and list/card enter animations
- **CSS `transition`** — hover, focus, press microinteractions (no JS overhead for simple states)
- All Framer Motion config centralised in `src/lib/animations/variants.ts`

### Spring Presets

```ts
// src/lib/animations/variants.ts

export const springs = {
  // Standard content entry (lists, cards)
  default: { type: 'spring', stiffness: 300, damping: 30 },

  // Elastic pop (badges, checkmarks, stat numbers)
  bouncy:  { type: 'spring', stiffness: 400, damping: 18 },

  // Fast response (button press, microinteractions)
  snappy:  { type: 'spring', stiffness: 600, damping: 35 },
} as const
```

### Variant Library

```ts
export const variants = {
  fadeSlideUp: {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: springs.default },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
  },

  staggerContainer: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06 } },
  },

  staggerItem: {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: springs.default },
  },

  scaleIn: {
    hidden:  { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: springs.bouncy },
    exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
  },

  pageEnter: { opacity: 0,  x: '100%' },
  pageVisible: { opacity: 1, x: 0, transition: { ...springs.default, duration: 0.35 } },
  pageExit:  { opacity: 0,  x: '-25%', transition: { duration: 0.2, ease: 'easeIn' } },
} as const
```

### Page Transitions — Slide Horizontal

Implemented at the dashboard layout level via `AnimatePresence`:

```tsx
// src/app/(dashboard)/layout.tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={pathname}
    variants={variants}
    initial="pageEnter"
    animate="pageVisible"
    exit="pageExit"
  >
    {children}
  </motion.div>
</AnimatePresence>
```

- Sidebar is **outside** the animated wrapper — only main content area transitions
- `mode="wait"` ensures exit completes before enter starts
- Duration: ~350ms enter, ~200ms exit

### List & Card Entry Pattern

```tsx
// Standard usage across all list pages
<motion.ul variants={variants.staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={variants.staggerItem}>
      <ItemCard item={item} />
    </motion.li>
  ))}
</motion.ul>
```

---

## 5. Expressive Moments

Six celebration animation components in `src/components/animations/`:

| Component | File | Trigger Location | Effect |
|---|---|---|---|
| `WorkoutCompleteAnimation` | `workout-complete.tsx` | Session complete dialog | Ring fills 0→100% + glow burst + title flies in |
| `NewPRAnimation` | `new-pr.tsx` | Session Logger when new 1RM detected | Progress bars race + PR badge spins in + gold glow |
| `CheckInAnimation` | `check-in.tsx` | Check-in submit success | Week dots light up staggered + streak badge pops |
| `StreakMilestoneAnimation` | `streak-milestone.tsx` | 7 / 14 / 30 / 60 / 100 day milestones | Large number scales in + gradient bars rise + fire floats |
| `NutritionDayCompleteAnimation` | `nutrition-day-complete.tsx` | After Day Complete confirm | Three concentric macro rings fill + pills pop out |
| `BodyTestImprovementAnimation` | `body-test-improvement.tsx` | Body test result when BF% or weight improved vs last | Before/after numbers appear + arrow pops + green diff card rises |

Each component:
- Accepts a single `onComplete?: () => void` prop — fires when animation finishes
- Is a pure visual layer — no state, no API calls
- Auto-plays on mount, no external trigger needed
- Has `prefers-reduced-motion` fallback (instant show, no animation)

---

## 6. Four-Phase Implementation Plan

### Phase 1 — Foundation Layer

**Goal**: Animation infrastructure and token updates in place, page transitions live.

- Create `src/lib/animations/variants.ts` with all spring presets and variants
- Add `primary` / `primary-light` to `tailwind.config.ts`
- Wire `AnimatePresence` page transition into `src/app/(dashboard)/layout.tsx`
- Migrate sidebar navigation highlights from emerald to indigo
- Update `CLAUDE.md` design guidelines to reflect Indigo Premium palette

**Success criteria**: Navigate between any two pages — Slide Horizontal transition plays. Sidebar active item shows indigo. All tests green.

---

### Phase 2 — Shared Component Library

**Goal**: All reusable components upgraded to Premium Dark + Rich Motion.

Components to upgrade:

| Component | Key changes |
|---|---|
| `PageHeader` | Add `motion.div` fade-slide-up; subtitle uses `text-foreground/65` |
| `StatCard` | Surface 2 glass, indigo icon gradient, number uses bouncy scaleIn |
| `EmptyState` | Subtle fade-in, icon gets glow on relevant colour |
| `Card` (custom surface wrapper) | Surface 1 glass token, hover ring upgrade |
| `Button` (primary variant) | `bg-primary hover:bg-primary/90`, indigo glow on focus |
| `Badge` / status chips | Indigo for active/in-progress, emerald for complete, amber for achievement |
| `MacroPill` | Unchanged colours, add `scaleIn` on mount |
| `Skeleton` | Pulse animation stays; ensure it matches new Surface 1 token |

**Success criteria**: Any page using these components shows Premium Dark cards and indigo primary. All tests green.

---

### Phase 3 — Core Feature Domains

**Goal**: Highest-usage pages get full Premium Dark + stagger animations.

Domains (in priority order):

1. **My Training** — cockpit landing (stagger stat cards + activity strip), Session Logger (exercise rows stagger, set chip bounce), completed session read-only
2. **Member Training** — Plan Overview, Session Logger (same as above), Personal Bests board
3. **Nutrition** — template list, food list (stagger), macro ring charts animate on mount
4. **Body Tests** — summary strip animate in, card grid stagger, history chart draws on scroll-into-view

**Success criteria**: Each domain's main list and detail page uses stagger entry. Charts and rings animate on mount. All tests green.

---

### Phase 4 — Remaining Domains + Expressive Moments

**Goal**: Full platform coverage + all 6 celebration animations wired up.

Remaining domains:
- Calendar (session blocks stagger in on week load)
- Equipment (card grid stagger, EditEquipmentDialog slides up)
- Check-in (history list stagger)
- Progress charts (heatmap cells animate in, 1RM chart draws)
- Member Health (injury cards stagger)
- Settings / Profile (tab content fades in on switch)

Expressive moments wiring:
- `WorkoutCompleteAnimation` → session complete dialog
- `NewPRAnimation` → Session Logger 1RM check (both member and self-tracking)
- `CheckInAnimation` → check-in submit
- `StreakMilestoneAnimation` → check-in submit when milestone hit (7/14/30/60/100)
- `NutritionDayCompleteAnimation` → `DayCompleteBar` after confirm
- `BodyTestImprovementAnimation` → body test result page on improved result

**Success criteria**: All domains upgraded. All 6 animations fire correctly. Full E2E suite green. `pnpm build` clean.

---

## 7. Design Language Reference

> This section is the living reference for future dashboard enrichment work. When building new pages or enriching existing dashboards for Owner / Trainer / Member roles, apply these rules without re-designing from scratch.

### Quick-Reference Card for New Pages

```
Background:      bg-background
Standard card:   bg-white/[.04] ring-1 ring-white/10 backdrop-blur-sm rounded-xl
Elevated card:   bg-white/[.07] ring-1 ring-white/[.15] backdrop-blur-md rounded-xl
Primary action:  bg-primary (indigo-500) text-white
Success state:   text-emerald-400 / bg-emerald-500/10 ring-emerald-500/20
Achievement:     text-amber-400 / bg-amber-500/10 ring-amber-500/20
Secondary text:  text-foreground/65  ← NEVER text-muted-foreground
Icon container:  bg-gradient-to-br from-primary to-indigo-700 (or domain colour)
Hero number:     text-4xl font-extrabold tracking-tighter
Data value:      font-light tracking-tight
List animation:  staggerContainer + staggerItem variants
Page animation:  pageEnter / pageVisible / pageExit via layout AnimatePresence
```

### Do / Don't

| Do | Don't |
|---|---|
| Use `text-foreground/65` for helper text | Use `text-muted-foreground` |
| Use Surface 1/2 glass tokens for cards | Use `bg-[#0c0c0c]` hardcoded hex |
| Use `bg-primary` for primary buttons | Use `bg-emerald-500` for primary buttons |
| Keep emerald for *success/completion* states | Use emerald as the main brand colour |
| Wrap list renders in `staggerContainer` | Animate every element individually with custom delays |
| Use `springs.bouncy` for badge/number pop | Use `duration-300 ease-in-out` for spring-like effects |
| Add `prefers-reduced-motion` fallback to Expressive components | Skip accessibility for animation components |

---

## 8. File Map Summary

```
src/lib/animations/
  variants.ts              ← NEW: all spring presets + variant library

src/components/animations/
  workout-complete.tsx     ← NEW
  new-pr.tsx               ← NEW
  check-in.tsx             ← NEW
  streak-milestone.tsx     ← NEW
  nutrition-day-complete.tsx ← NEW
  body-test-improvement.tsx  ← NEW

tailwind.config.ts         ← MODIFY: add primary / primary-light tokens
src/app/(dashboard)/layout.tsx ← MODIFY: add AnimatePresence page transition
CLAUDE.md                  ← MODIFY: update design guidelines to Indigo Premium
```

All other changes are modifications to existing component and page files — no new routes or models.
