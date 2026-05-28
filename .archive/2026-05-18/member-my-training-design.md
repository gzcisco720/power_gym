# Member My Training — Design Spec

**Date**: 2026-05-18  
**Status**: Approved

---

## Problem

Members currently have no self-tracking workflow. The `/member/plan/` page lets them view their assigned plan and log sessions via the `WorkoutSession` model (trainer-visible), but there is no equivalent to the owner/trainer "My Training" cockpit for personal, self-directed workout logging.

---

## Goal

Create `/member/my-training/` that mirrors the owner/trainer My Training experience, with one structural difference: the left card shows the member's assigned training plan days instead of a self-created template library.

---

## Architecture

### New Routes

| Route | Component | Notes |
|-------|-----------|-------|
| `/member/my-training/` | `MemberTrainingLanding` (new server component) | Landing cockpit |
| `/member/my-training/session/[id]/` | `SelfWorkoutSession` (reused) | No changes needed |
| `/member/my-training/calendar/` | `SelfWorkoutCalendarClient` (reused) | No changes needed |

### New Components

**`src/components/self-tracking/member-plan-path-card.tsx`**

Client component. Props:
```typescript
interface MemberPlan {
  _id: string;
  templateId: string;
  name: string;
  days: Array<{
    dayNumber: number;
    name: string;
    exercises: Array<{
      groupId: string;
      isSuperset: boolean;
      exerciseId: string;
      exerciseName: string;
      isBodyweight: boolean;
      sets: number;
      repsMin: number;
      repsMax: number;
    }>;
  }>;
}

interface Props {
  plan: MemberPlan | null;
  basePath: '/member/my-training';
}
```

**When `plan` is null** — unified empty state:
- Icon (📋) + "No training plan assigned yet." + "Ask your trainer to assign a plan."
- No button (member cannot self-assign)

**When `plan` exists** — plan days displayed directly (no accordion):
- Header: plan name (left) + day count (right)
- Each day row: day name + exercise preview (first 3, truncated) + "Log" button
- On Log click: POST `/api/me/workout-logs` with `sourceTemplateId: plan.templateId`, `sourceTemplateDayNumber: day.dayNumber`, `dayName: day.name`, `plannedSets: buildPlannedSets(day)`
- Reuses `ActiveSessionConflictDialog` and `DayAlreadyLoggedDialog`

### Modified Components

**`src/components/self-tracking/template-path-card.tsx`** — Empty state redesign

Current empty state (text + button) → new unified style:
- Icon (🗂️) + "No templates yet." + "Create a training template to log structured workouts." + "＋ Create Template" button

### Modified Files

**`src/lib/auth/self-tracking-access.ts`**
- Add `member` to allowed roles
- Update return type union to include `'member'`

**`src/app/api/me/workout-logs/route.ts`**
- Remove template existence validation (lines 27–31): `sourceTemplateId` is stored as an opaque reference; no DB lookup needed
- No other changes

**`BasePath` type** (two locations):
- `src/components/self-tracking/template-path-card.tsx`
- `src/components/self-tracking/my-training-landing.tsx`

Add `/member/my-training` to the union.

**Member sidebar navigation** — add "My Training" link pointing to `/member/my-training`

### `MemberTrainingLanding` Server Component

Location: `src/components/self-tracking/member-training-landing.tsx`

Data fetched in parallel:
```typescript
const [activeLog, monthLogs, recent, memberPlan] = await Promise.all([
  logRepo.findActive(userId),
  logRepo.findByUserMonth(userId, year, month),
  logRepo.findRecent(userId, 10),
  memberPlanRepo.findActive(userId),
]);
```

Layout (identical to `MyTrainingLanding`):
1. `PageHeader` with calendar trigger
2. `ActiveSessionPrompt` if active log exists
3. `ActivityStrip` (empty/light/full state)
4. `PathCardsGrid`:
   - Left: `MemberPlanPathCard` (new)
   - Right: `FreestylePathCard` (unchanged)
5. `MiniWorkoutCalendar`

---

## What Is NOT Changed

- `/member/plan/` — kept as-is (trainer-assigned `WorkoutSession` system, trainer-visible)
- All other `/api/me/workout-logs/*` endpoints — no changes
- `SelfWorkoutSession`, `SelfWorkoutCalendarClient`, `MiniWorkoutCalendar`, `FreestylePathCard`, `ActivityStrip` — direct reuse, zero modification
- `WorkoutSession` model — untouched

---

## Data Flow

```
Member opens /member/my-training
  → MemberTrainingLanding fetches: activeLog, monthLogs, recent (SelfWorkoutLog), memberPlan (MemberPlan)
  → Left card shows plan days OR empty state
  → Right card is identical freestyle card

Member clicks "Log" on Day 3
  → POST /api/me/workout-logs { dayName, sourceTemplateId: plan.templateId, dayNumber, plannedSets }
  → SelfWorkoutLog created with userId = member's id
  → Redirect to /member/my-training/session/[id]
  → SelfWorkoutSession renders (same component as trainer/owner)
```
