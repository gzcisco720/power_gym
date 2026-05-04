# Training Module Refactor — Design Spec

**Date**: 2026-05-04  
**Supersedes**: [training-redesign-design.md](../../2026-05-03/plans/training-redesign-design.md)  
**Status**: Approved

---

## Overview

Full refactor of the Training module across all three roles (owner / trainer / member). The goals are:

1. Surface exercise images everywhere exercises appear
2. Enable members to log workouts and submit RPE + coach note on completion
3. Add a monthly training log calendar reachable from the Plan Overview page
4. Fix plan template builder UX (sets count is already stored correctly; needs UI clarity)
5. Seed 873 exercises from `exercises_catalog.json` and gym equipment from `gym_equipment.json`
6. Allow trainer/owner to log workouts on behalf of members, with per-exercise notes that persist across plan changes
7. Remove Personal Bests from sidebar navigation (data layer stays; PB surfaced through session history)

---

## Chosen Approach: B — Clean Refactor

Keep existing architecture; add three targeted model changes and new pages/components. Trainer and member session logging share a single `SessionLogger` component driven by a `mode` prop.

---

## 1. Data Model Changes

### 1.1 WorkoutSession — three new fields

```ts
loggedBy:   ObjectId | null   // null = member self-logged; trainer ObjectId = trainer-logged
rpe:        number | null      // 1–10 Rate of Perceived Exertion, set at session completion
memberNote: string | null      // member's note to coach, set at session completion
```

Existing fields (`memberId`, `memberPlanId`, `dayNumber`, `dayName`, `startedAt`, `completedAt`, `sets[]`) are unchanged.

### 1.2 ExerciseNote — new collection

Stores trainer notes per (member, exercise) pair. Persists independent of plan or session lifetime.

```ts
interface IExerciseNote extends Document {
  memberId:     ObjectId
  exerciseId:   ObjectId
  exerciseName: string          // denormalised for display without joins
  trainerId:    ObjectId
  entries: {
    content:   string
    sessionId: ObjectId | null  // optional context — which session prompted this note
    createdAt: Date
  }[]
}

// Compound index: { memberId: 1, exerciseId: 1 }
```

### 1.3 Exercise model — add bodyParts field

```ts
bodyParts: string[]   // e.g. ["biceps", "forearms"] — from exercises_catalog.json
```

Used for filtering in the exercise search sheet.

### 1.4 Equipment model (seed only, UI deferred)

Import `gym_equipment.json` into a `GymEquipment` collection. No UI changes in this phase; seeded now for future use.

### Unchanged models

`PlanTemplate`, `MemberPlan`, `PersonalBest`, `ScheduledSession`, all nutrition/body-test models.

---

## 2. Navigation Changes

### Member sidebar — TRAINING group

| Before | After |
|--------|-------|
| My Plan | My Plan ✓ |
| **Personal Bests** | ~~Personal Bests~~ (removed from nav) |
| My Progress | My Progress ✓ |
| My Schedule | My Schedule ✓ |

### Trainer sidebar — TRAINING group

| Before | After |
|--------|-------|
| My Plan | My Plan ✓ |
| **Personal Bests** | ~~Personal Bests~~ (removed from nav) |
| Plan Templates | Plan Templates ✓ |

### Owner sidebar — TRAINING group

| Before | After |
|--------|-------|
| My Plan | My Plan ✓ |
| **Personal Bests** | ~~Personal Bests~~ (removed from nav) |
| Plan Templates | Plan Templates ✓ |

> The `/member/pbs`, `/trainer/my-pbs`, `/owner/my-pbs` page files are **not deleted** — just unlinked from the sidebar. PB data surfaces via session history and trainer exercise notes.

---

## 3. Page Routing Changes

### New pages

| Route | Who | Description |
|-------|-----|-------------|
| `/member/plan/calendar` | member | Monthly workout calendar; reachable via 📅 icon on Plan Overview |
| `/trainer/members/[id]/log/[sessionId]` | trainer | Trainer logs a workout on behalf of a member |

### Modified pages

| Route | Change |
|-------|--------|
| `/member/plan` (PlanOverview) | Add 📅 calendar icon button (top-right); show exercise images |
| `/member/plan/session/[id]` (SessionLogger) | On "Complete Workout" show RPE slider + memberNote before final submit |
| `/owner/my-plan`, `/trainer/my-plan` | Same session-complete modal with RPE + note |
| `/trainer/members/[id]/plan` | Add "Log Workout for [name]" button; show exercise images in plan view |
| `/trainer/calendar` | Clicking a member's session event opens the trainer log page |

---

## 4. API Changes

### Extended endpoints

| Method | Route | Change |
|--------|-------|--------|
| `POST` | `/api/sessions` | Accept optional `loggedBy` field (trainer ID) |
| `POST` | `/api/sessions/[id]/complete` | Accept optional `rpe: number` and `memberNote: string` |

### New endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/exercise-notes` | Query by `?memberId=&exerciseId=` — returns note history for inline display |
| `POST` | `/api/exercise-notes` | Create first note entry or append to existing ExerciseNote doc |
| `PATCH` | `/api/exercise-notes/[entryId]` | Edit an existing note entry (trainer only) |
| `GET` | `/api/sessions?memberId=&year=&month=` | Return all completed sessions for a member in a given month (calendar) |

---

## 5. Component Architecture

### SessionLogger (`components/training/session-logger.tsx`)

The single source of truth for logging a workout. Props:

```ts
interface SessionLoggerProps {
  session:          Session
  backPath:         string
  mode:             'member' | 'trainer'
  loggedForMember?: { id: string; name: string }  // trainer mode only
}
```

- `mode='member'` — standard logging UI; on complete shows `WorkoutCompleteModal` (RPE + note)
- `mode='trainer'` — same logging UI, but each exercise card renders `ExerciseNotePanel` below the set rows

### New components

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkoutCompleteModal` | `components/training/` | RPE slider (1–10) + textarea note to coach; shown after all sets logged |
| `ExerciseNotePanel` | `components/training/` | Fetches and displays historical notes for (memberId, exerciseId); inline add/edit |
| `WorkoutCalendar` | `components/calendar/` | Monthly grid; days with sessions shown as filled circles; click to select |
| `SessionDetailPanel` | `components/calendar/` | Shows exercise thumbnails + set results for a selected calendar day |

### Unchanged components

`PlanOverview`, `ExerciseSearchSheet`, `ExerciseThumbnail`, `ExerciseBadge`, `PlanTemplateForm`

---

## 6. Exercise & Equipment Seeding

One-time script: `scripts/seed-exercises.ts`

- Reads `context/data/exercises_catalog.json` (873 exercises)
- Upserts into `Exercise` collection with `isGlobal: true`, `bodyParts` populated
- Reads `context/data/gym_equipment.json`
- Upserts into `GymEquipment` collection
- Safe to re-run (upsert on name)

---

## 7. UI Design Principles

- **Exercise images**: shown everywhere an exercise appears — Plan Overview cards, Session Logger exercise headers, Session Detail in calendar. Use `ExerciseThumbnail` (44px on overview, 38px in logger, 34px in calendar detail).
- **Responsive**: all new pages use the existing two-column desktop / single-column mobile pattern. Desktop session logger shows exercises in a 2-column grid; mobile shows single column.
- **Labels (A / B / C1 / C2)**: colour-coded letter badges on every exercise, generated by `labelExercises()`.
- **Superset grouping**: bordered container with "Superset" header; both on Plan Overview and Session Logger.
- **Trainer banner**: when `mode='trainer'`, a green "Logging for: [Name]" badge appears below the day title.

---

## 8. Implementation Stages

| Stage | Scope |
|-------|-------|
| **1 — Data layer** | Exercise model `bodyParts` field; seeding script; `ExerciseNote` model + repository; `WorkoutSession` new fields (`loggedBy`, `rpe`, `memberNote`) |
| **2 — API layer** | `/api/exercise-notes` (GET/POST/PATCH); `/api/sessions` calendar query; extend `/api/sessions` POST and `/api/sessions/[id]/complete` |
| **3 — Components** | `WorkoutCompleteModal`; `ExerciseNotePanel`; `WorkoutCalendar` + `SessionDetailPanel`; update `SessionLogger` to accept `mode` prop |
| **4 — Pages** | `/member/plan/calendar` page; `/trainer/members/[id]/log/[sessionId]` page; update `PlanOverview` (calendar icon); update trainer member plan page (Log Workout button); update trainer calendar (session click → log page); remove PBs from all three nav configs |
| **5 — Validation** | `pnpm test`, `pnpm lint`, `pnpm build`; manual smoke test of all three roles |

---

## 9. Out of Scope (this refactor)

- Equipment UI (seed only)
- Personal Bests page redesign
- Superset logging interleaving (sets are still logged per-exercise)
- Progressive overload tracking
