# Member Hub Header Redesign

**Date:** 2026-05-20
**Status:** Approved
**Scope:** `src/app/(dashboard)/trainer/members/[id]/layout.tsx` only

---

## Problem

The member hub header (`/trainer/members/:id`) has five concrete issues:

1. **Hardcoded hex colors throughout** — `bg-[#050505]`, `border-[#0f0f0f]`, `bg-[#1a1a1a]`, `border-[#222]`, `text-[#666]`, `text-[#333]` — violates the project's token rules and breaks any future theme work.
2. **Avatar nearly invisible** — 40×40 gray circle (`bg-[#1a1a1a]`, `text-[#666]`) blends into the near-black background; initials are illegible.
3. **Back link wrong position and wrong visibility** — `← All Members` sits in the top-right, styled in `text-[#666]`, extremely easy to miss. Trainer role has no back link at all.
4. **No cross-tab CTA** — "Log Workout" is buried in the Plan tab. Trainers who first check Health or Check-ins must navigate away just to log a session.
5. **Sub-info line is weak** — "Member for N days" is a vanity metric with no actionable meaning.

---

## Design

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  ← Members                                    (breadcrumb)   │
│  [Avatar]  Name                     [Log Workout button]     │
│            email · Joined Apr 2, 2026                        │
├──────────────────────────────────────────────────────────────┤
│  Overview  Plan  Body Tests  Nutrition  Progress  Health  …  │
└──────────────────────────────────────────────────────────────┘
```

The header is `sticky top-0 z-10`, same as today. Three rows inside:
1. Breadcrumb row (back link)
2. Identity + CTA row (avatar, name/email, Log Workout)
3. Tab bar (unchanged)

---

## Element Specs

### Breadcrumb (back link)

| Property | Value |
|---|---|
| Trainer role text | `← Members` |
| Owner role text | `← All Members` |
| Trainer href | `/trainer/members` |
| Owner href | `/owner/members` |
| Style | `text-[11px] text-foreground/30 hover:text-foreground/55 transition-colors flex items-center gap-1` |
| Padding | `pt-3 px-4 sm:px-8` |

### Avatar

| Property | Value |
|---|---|
| Size | `h-12 w-12` (48px) |
| Shape | `rounded-full` |
| Background | `bg-primary/15` |
| Border | `border border-primary/30` |
| Outer glow | `ring-4 ring-primary/6` |
| Initials color | `text-primary-light` |
| Initials size | `text-[15px] font-bold` |

### Identity row

| Property | Value |
|---|---|
| Name | `text-[16px] font-bold text-foreground` |
| Sub-info | `text-[11px] text-foreground/40 mt-0.5` |
| Sub-info content | `{email} · Joined {formatted join date}` |
| Join date format | `MMM D, YYYY` (e.g. `Apr 2, 2026`) |

### Log Workout button

| Property | Value |
|---|---|
| Style | `bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors` |
| Visibility | Hidden when member has no active training plan |
| Click behavior | Navigate to `/trainer/members/:id/plan` (Plan tab has the day selector + log flow) |
| Data needed | Whether an active plan exists — already fetched in Overview's `StatCardsSection`, but layout needs its own lightweight check |

The layout server component will make a single `planRepository.findActiveForMember(memberId)` call (or equivalent) to determine button visibility. This is a read of one document — acceptable latency.

### Color token replacements

| Old (hardcoded) | New (token) |
|---|---|
| `bg-[#050505]` | `bg-background` |
| `border-[#0f0f0f]` | `border-border/60` |
| `bg-[#1a1a1a]` (avatar bg) | `bg-primary/15` |
| `border-[#222]` (avatar border) | `border-primary/30` |
| `text-[#666]` (initials, sub-info) | `text-primary-light` / `text-foreground/40` |
| `text-[#333]` (separator dot) | `text-foreground/15` |

---

## Data Requirements

The layout already fetches the member document (name, email, createdAt, trainerId). One additional fetch is needed:

```ts
// Lightweight active-plan check — returns boolean
const hasActivePlan = await planRepo.hasActivePlanForMember(memberId);
```

If `IPlanTemplateAssignmentRepository` already exposes a method that can answer this, use it. If not, a direct `findOne({ memberId, status: 'active' })` on the assignments collection is acceptable in the layout — do not create a new abstraction for a single layout.

---

## What Does Not Change

- `src/components/shared/tab-nav.tsx` — tab bar styling is correct as-is
- `src/components/shared/member-tab-nav.tsx` — tab definitions unchanged
- The owner's URL structure (`/trainer/members/:id` used by both roles) — separate problem, out of scope
- Log Workout day-selection logic — lives in Plan tab, not duplicated here

---

## Success Criteria

1. No hardcoded hex values remain in `layout.tsx`
2. Avatar is visually distinct against `bg-background` at 1440px and 375px widths
3. Trainer role sees `← Members` link in top-left
4. Owner role sees `← All Members` link in top-left
5. `Log Workout` button appears when member has an active plan; absent when they don't
6. Clicking `Log Workout` navigates to the Plan tab
7. `pnpm lint` passes with zero warnings
8. No existing E2E specs break (layout change is structural, not flow-changing)
