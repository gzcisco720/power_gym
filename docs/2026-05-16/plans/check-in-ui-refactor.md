# Check-In Page UI Refactor

**Date**: 2026-05-16
**Status**: Approved

---

## Goal

Refactor the member check-in page layout: fix the centering bug, break the monolithic form into focused card sections, redesign sliders to a compact single-row layout, replace plain number inputs with stat grid cards, and add a dashed-border photo add slot.

**No new functionality** — pure UI/layout refactor. Actions, submission logic, photo upload, and celebration animations are untouched.

---

## Problems Fixed

| Problem | Fix |
|---|---|
| Content not centered (`max-w-2xl` without `mx-auto`) | Add `mx-auto` to container in `page.tsx` |
| Flat 296-line monolithic form, visually overwhelming | Split into 4 focused card sections |
| 2-column slider grid wastes vertical space | Compact single-row: label (fixed) + slider (flex) + value |
| Plain `<Input>` for stats — `type="number"` violates project rules | Stat grid cells with `type="text" inputMode="decimal"` |
| Photo area has no visual affordance for adding more | Dashed-border `+` slot alongside thumbnails |

---

## Layout Structure

```
page.tsx
└── PageHeader (full width, unchanged)
└── <div class="max-w-2xl mx-auto px-4 sm:px-8 py-7">   ← fix centering
    └── CheckInForm
        ├── CheckInFeelingsSection   (card 1 — 7 sliders)
        ├── CheckInStatsSection      (card 2 — 6 stat inputs)
        ├── CheckInDietSection       (card 3 — diet toggle + 3 textareas)
        ├── CheckInPhotosSection     (card 4 — thumbnails + dashed add slot)
        └── Submit button + error
```

---

## Component Details

### `CheckInFeelingsSection`
- Props: `ratings: RatingFields`, `onChange: (key, value) => void`
- Card label: "How are you feeling?"
- Each rating: single row — `<label>` fixed `w-24` + `<input type="range">` flex-1 + current value right-aligned in `text-primary-light`
- No grid, single column, `space-y-3`

### `CheckInStatsSection`
- Props: one string state + setter per field (weight, waist, steps, exerciseMinutes, walkRunDistance, sleepHours)
- Card label: "Body & Activity"
- 3-column grid of cells; each cell: label (top, small) + `<input>` (middle, large text) + unit (bottom, muted)
- Input: `type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*"` — no `type="number"`
- Units: kg / cm / steps / min / km / hrs

### `CheckInDietSection`
- Props: `stuckToDiet`, `onStuckToDiet`, `dietDetails`, `onDietDetails`, `wellbeing`, `onWellbeing`, `notes`, `onNotes`
- Card label: "Diet & Wellbeing"
- Diet adherence toggle (Yes / Partial / No) — existing style, no change
- `dietDetails` textarea with label "Diet details"
- Thin `border-t border-foreground/[.06]` divider
- `wellbeing` textarea with label "Wellbeing"
- `notes` textarea with label "Notes for trainer"

### `CheckInPhotosSection`
- Props: `photos: string[]`, `uploading: boolean`, `onFileChange`, `error?: string`
- Card label: "Progress Photos" + right-aligned count badge `N / 5`
- Photo display: `flex flex-wrap gap-2`
  - Uploaded photos: `64×64` thumbnails, `rounded-lg object-cover ring-1 ring-foreground/10`
  - When `photos.length < 5`: dashed-border add slot — `64×64 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center cursor-pointer hover:border-foreground/40 transition-colors` with `+` icon, wraps a hidden `<input type="file">`
  - Uploading state: slot shows a spinner instead of `+`
- No label below the grid (count badge in header is sufficient)

### `CheckInForm` (refactored shell)
- Remains `'use client'`
- Owns all state (unchanged)
- Renders the 4 section components + submit button + error message + celebration modals
- `alreadySubmitted` / `submitted` early-return card: unchanged

---

## Visual Tokens

| Element | Token |
|---|---|
| Card background | `bg-white/[.02]` |
| Card border | `ring-1 ring-foreground/[.06]` |
| Card padding | `p-5` |
| Card border-radius | `rounded-xl` |
| Card label | `text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4` |
| Slider value | `text-[13px] font-semibold text-primary-light w-5 text-right` |
| Stat cell bg | `bg-white/[.03] rounded-lg p-3` |
| Stat cell label | `text-[10px] text-foreground/40 mb-1` |
| Stat cell value | `text-[15px] font-bold text-foreground` |
| Stat cell unit | `text-[10px] text-foreground/40 mt-1` |
| Photo add slot | `w-16 h-16 rounded-lg border border-dashed border-foreground/20 hover:border-foreground/40` |
| Photo thumb | `w-16 h-16 rounded-lg object-cover ring-1 ring-foreground/10` |
| Gap between cards | `space-y-4` on the form wrapper |

---

## Files Changed

| File | Change |
|---|---|
| `src/app/(dashboard)/member/check-in/page.tsx` | Add `mx-auto` to content container |
| `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx` | Refactor into shell, move state/submit logic only |
| `src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx` | New — 7 sliders |
| `src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx` | New — 6 stat inputs |
| `src/app/(dashboard)/member/check-in/_components/check-in-diet-section.tsx` | New — diet toggle + 3 textareas |
| `src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx` | New — photo grid + dashed add slot |

---

## Out of Scope

- Streak calculation (hardcoded `streakDays = 0` — separate issue)
- History view for past check-ins
- Any changes to actions, API routes, or data model
- Celebration animation changes
