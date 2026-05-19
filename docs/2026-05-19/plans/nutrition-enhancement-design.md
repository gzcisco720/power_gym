# Nutrition Enhancement — Design Spec

**Date**: 2026-05-19  
**Status**: Approved

---

## Problem

The nutrition feature has five gaps:

1. **Owner/Trainer have no "start from template" flow** — `SelfNutritionDayView` always starts freestyle; `sourceTemplateId` field exists but has no UI entry point.
2. **Members can only log against their assigned plan** — no freestyle capability.
3. **No plan-vs-actual comparison for freestyle logs** — members logging freestyle cannot see how they did relative to their plan targets.
4. **No nutrition landing page** — all roles drop straight into the day view, with no overview or path selection.
5. **Member day view lacks `DayCompleteConfirmDialog`** — members can accidentally complete a day without being reminded of incomplete meals.

---

## Goals

- Add a My Nutrition landing cockpit for all three roles, mirroring the My Training pattern.
- Let owner/trainer start a nutrition day from a template day type.
- Give members a freestyle logging path (separate from plan-based logging).
- Show a plan-vs-actual comparison dialog after a member completes a freestyle day.
- Add `DayCompleteConfirmDialog` to the member day view.

---

## Out of Scope

- Removing per-meal complete toggles (they stay as-is).
- Changes to the nutrition template editor or food library.
- Trainer/owner comparison dialogs (they have no assigned plan to compare against).

---

## Architecture

### Route Changes

| Role | Old route | New routes |
|---|---|---|
| Owner | `/owner/my-nutrition?date=X` → day view | `/owner/my-nutrition` → landing; `/owner/my-nutrition/day?date=X` → day view |
| Trainer | `/trainer/my-nutrition?date=X` → day view | `/trainer/my-nutrition` → landing; `/trainer/my-nutrition/day?date=X` → day view |
| Member | `/member/nutrition` → day view | `/member/nutrition` → landing; `/member/nutrition/day?date=X&mode=plan\|free` → day view |

### Data Model

No new models. Member freestyle uses the existing `SelfNutritionLog` model (same as owner/trainer). `requireSelfTrackingRole` is extended to include `'member'`.

`NutritionDailyLog` (plan-based, member) is unchanged.

### Member Day View — Two Modes

| `mode` param | Data source | API |
|---|---|---|
| `plan` | `NutritionDailyLog` | `GET/PUT /api/members/[memberId]/nutrition/log/[date]` |
| `free` | `SelfNutritionLog` | `GET/PUT /api/me/nutrition-logs/[date]` |

When `mode=free`, the day view also fetches plan targets for that date via `GET /api/members/[memberId]/nutrition/log/[date]` (returns plan-prefilled data when no saved log exists). These targets are passed as props to the `DayCompleteConfirmDialog`-successor comparison dialog.

---

## New Components

### `MyNutritionLanding` (server component)
Location: `src/components/self-tracking/my-nutrition-landing.tsx`

Used by owner and trainer. Fetches in parallel:
- `SelfNutritionLog` list for current month (activity strip + mini calendar)
- `NutritionTemplate` list for the current user (template path card)
- Recent self nutrition logs (freestyle card state)

Layout (mirrors `MyTrainingLanding`):
```
PageHeader ("My Nutrition" + NutritionCalendarHeaderTrigger)
ActivityStrip  (days logged this month, avg kcal, avg protein)
PathCardsGrid
  ├── NutritionTemplatePathCard
  └── NutritionFreestylePathCard
MiniNutritionCalendar
```

### `MemberNutritionLanding` (server component)
Location: `src/components/self-tracking/member-nutrition-landing.tsx`

Used by member. Fetches in parallel:
- `SelfNutritionLog` list for current month
- `NutritionDailyLog` list for current month (plan-based days)
- Active `MemberNutritionPlan`
- Recent logs (for freestyle card state)

Layout (same structure, different path cards):
```
PageHeader ("My Nutrition" + NutritionCalendarHeaderTrigger)
ActivityStrip
PathCardsGrid
  ├── MemberNutritionPlanPathCard
  └── NutritionFreestylePathCard
MiniNutritionCalendar
```

### `NutritionTemplatePathCard` (client component)
Location: `src/components/self-tracking/nutrition-template-path-card.tsx`

Mirrors `TemplatePathCard`. Props:
```ts
interface NutritionTemplate {
  _id: string;
  name: string;
  dayTypes: Array<{
    name: string;
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }>;
}
interface Props {
  templates: NutritionTemplate[];
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
}
```

Behaviour:
- Multiple templates → accordion (expand/collapse per template).
- Single template → auto-expanded.
- Each day type row shows name + macro targets + "Log" button.
- "Log" → navigates to `${basePath}/day?date=today&templateId=X&dayType=Y`.
- Empty state → "No templates yet. Create a nutrition template to log structured days."

### `MemberNutritionPlanPathCard` (client component)
Location: `src/components/self-tracking/member-nutrition-plan-path-card.tsx`

Mirrors `MemberPlanPathCard`. Props:
```ts
interface Props {
  plan: {
    _id: string;
    name: string;
    assignedByName: string;
    dayTypes: Array<{
      name: string;
      targetKcal: number;
      targetProtein: number;
      targetCarbs: number;
      targetFat: number;
    }>;
  } | null;
  basePath: '/member/nutrition';
}
```

Behaviour:
- Always expanded (no accordion — single plan).
- Shows plan name + "Assigned by [trainer]" + day type list.
- Each day type row: name + macro targets + "Log" button.
- "Log" → navigates to `/member/nutrition/day?date=today&mode=plan&dayType=Y`.
- No plan → empty state: "No nutrition plan assigned yet. Ask your trainer to assign one."

### `NutritionFreestylePathCard` (client component)
Location: `src/components/self-tracking/nutrition-freestyle-path-card.tsx`

Props: recent freestyle log summary (last date, kcal, macros) + basePath.

States: `empty` | `light` | `full` — same pattern as `FreestylePathCard`.

"Log Today" → navigates to `${basePath}/day?date=today` (owner/trainer) or `/member/nutrition/day?date=today&mode=free` (member).

### `MiniNutritionCalendar` (client component)
Location: `src/components/self-tracking/mini-nutrition-calendar.tsx`

Mirrors `MiniWorkoutCalendar`. Fetches `SelfNutritionLog` for current month. Displays kcal dot per logged day. Clicking a date navigates to that day's view.

### `NutritionPlanCompareDialog` (client component)
Location: `src/components/nutrition/nutrition-plan-compare-dialog.tsx`

Props:
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  loggedKcal: number;
  loggedProtein: number;
  loggedCarbs: number;
  loggedFat: number;
  planDayTypes: Array<{
    name: string;
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }>;
}
```

Behaviour:
- Pill selector at the top for each plan day type.
- Selecting a pill updates the comparison table: Logged vs Target vs Diff.
- Over-target values shown in red; under-target in muted.
- "Done" closes the dialog.
- **Never blocks submission.** Caller must only set `open=true` after the API PUT has returned successfully AND the `NutritionDayCompleteAnimation` `onComplete` callback fires.

---

## Modified Components

### `SelfNutritionDayView`
- Accept optional `initialTemplateId?: string` and `initialDayTypeName?: string` props.
- When no existing log and both props present: fetch the template's day type from `/api/nutrition-templates/[id]`, use its meals as the initial state (with `sourceTemplateId` and `sourceTemplateDayTypeName` set).
- No other changes.

### `DailyNutritionView` (member plan-based day view)
- Add `DayCompleteConfirmDialog` — same pattern as `SelfNutritionDayView`.
- After `markDayComplete` API call succeeds AND `NutritionDayCompleteAnimation` `onComplete` fires: if plan day types are available, open `NutritionPlanCompareDialog`.
- Plan day types fetched alongside the daily log on mount.

### `src/lib/auth/self-tracking-access.ts`
- Add `'member'` to the allowed roles list.

### Member `/member/nutrition/page.tsx`
- Replace `DailyNutritionView` render with `MemberNutritionLanding`.

### Owner/Trainer `my-nutrition/page.tsx` (both)
- Replace `SelfNutritionDayViewWithRouter` render with respective landing component.

---

## New Routes (files)

| File | Renders |
|---|---|
| `src/app/(dashboard)/owner/my-nutrition/day/page.tsx` | `SelfNutritionDayViewWithRouter` (moved from parent) |
| `src/app/(dashboard)/trainer/my-nutrition/day/page.tsx` | `SelfNutritionDayViewWithRouter` (moved from parent) |
| `src/app/(dashboard)/member/nutrition/day/page.tsx` | Mode-aware wrapper: `mode=plan` → `DailyNutritionView`; `mode=free` → `SelfNutritionDayView` |

---

## API Changes

### `src/lib/auth/self-tracking-access.ts`
Add `'member'` to allowed roles — unlocks `GET/PUT /api/me/nutrition-logs/[date]` for members.

### `GET /api/members/[memberId]/nutrition/log/[date]`
Add `targetKcal`, `targetProtein`, `targetCarbs`, `targetFat` to the response when returning plan-prefilled data (used by compare dialog to fetch plan targets).

No new API routes needed.

---

## E2E Test Coverage (Playwright)

All specs go in `e2e/` under the appropriate role folder.

| Spec file | Flows covered |
|---|---|
| `e2e/self-tracking/owner-nutrition-landing.spec.ts` | Landing renders; template accordion expand/collapse; "Log" from template day navigates to day view with prefilled meals; freestyle "Log Today" navigates to day view |
| `e2e/member/member-nutrition-landing.spec.ts` | Landing renders; plan day type list visible; "Log" (plan mode) navigates to day view; freestyle "Log Today" navigates to freestyle day view |
| `e2e/member/member-nutrition-freestyle.spec.ts` | Freestyle day view loads; food can be added; Complete Day → confirm dialog → animation → compare dialog appears with pill selector; switching pills updates comparison table; "Done" closes dialog |
| `e2e/member/member-nutrition-plan.spec.ts` | Plan-based day view loads with pre-filled meals; Complete Day → confirm dialog → compare dialog appears (same flow); no regression on existing plan logging |

---

## Design Tokens & Style

Follows existing CLAUDE.md conventions:
- Landing page primary accent: `text-primary-light` (`#a5b4fc`) for "From Template" label; `text-[#22c55e]` for "Freestyle" label — same as training.
- Compare dialog uses `bg-card ring-1 ring-foreground/10`, pill selected state `bg-primary/15 border-primary/50 text-primary-light`.
- Over-target diff: `text-destructive`. Under-target: `text-foreground/35`.
