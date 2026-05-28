# Free Day Logging — Design Spec

**Date**: 2026-05-11
**Status**: Approved
**Supersedes**: `one-checkin-per-day-design.md`, relevant sections of `my-training-cockpit-design.md`

---

## Core Philosophy Change

A training plan or template is a **reference menu**, not an execution schedule.

- Owner/Trainer and Member can log **any day, any order, any number of times per day**
- Multiple logs in one day are valid (morning session + afternoon session, or double Day A)
- The plan provides structure; it does not restrict what gets logged when
- Trainers/owners select any day from any of their templates to log — no forced rotation

---

## What Gets Removed

| Removed | Reason |
|---|---|
| One-check-in-per-day blocking (`findToday` guard in POST) | Conflicts with free logging |
| `TODAY_ALREADY_LOGGED` error code from both APIs | No longer a valid error state |
| `?overwrite=true` param on both APIs | Not needed without one-per-day rule |
| Overwrite dialog in `template-path-card`, `freestyle-path-card`, `plan-overview` | Same |
| "Next in rotation" auto-calculation | Plans are not sequential schedules |
| Progress dots + "3/3" display in `TemplatePathCard` | Misleading with free selection |
| `nextDay`, `completedDayNumbers`, `cycleSize`, `exercisePreview`, `plannedSets` props | All derived from old rotation logic |
| `findLastByTemplate` call in landing server component | Was only for next-day calculation |
| `TemplateDayPickerDialog` component | Replaced by inline expandable list |

---

## Active Session Conflict — New Behaviour

One active (not-yet-completed) session per user at a time is still enforced — not to limit logging frequency, but to prevent accidental data loss from two concurrent unfinished sessions.

**Flow when user starts a new session while one is active:**

1. API returns `409 ACTIVE_SESSION_EXISTS` with `{ _id, dayName, setCount, startedAt }`
2. Frontend shows a destructive-action dialog:
   > **"[Day A] is still in progress"**
   > You have [X] sets logged in this session. Starting a new session will permanently delete it.
   > [Resume Day A] [Delete & Start New]
3. "Resume Day A" → navigate to existing session (no API call)
4. "Delete & Start New" → `DELETE /api/sessions/:id` (or `/api/me/workout-logs/:id`), then POST new session

**API change:** Replace `findToday` blocking with `findActive` blocking in both POST routes. Return `409 ACTIVE_SESSION_EXISTS` (not `TODAY_ALREADY_LOGGED`). Add `setCount` to response body.

---

## Owner/Trainer — Template Card Redesign

### New `TemplatePathCard` props

```typescript
interface TemplatePathCardProps {
  templates: UserTemplate[];   // all templates belonging to this user
  basePath: BasePath;
  activeSession: { _id: string; dayName: string; setCount: number } | null;
}
```

No `state` (full/light/empty) distinction. Has-templates vs no-templates is the only split.

### UI: Expandable list

- Each template renders as a collapsed row (name + day count)
- Tap a template header → expands inline, revealing all its days
- Only one template expanded at a time (tapping another collapses the current)
- Each day row: `[Day Name — Day Label]  [exercise hints]  [Log →]`
- Clicking "Log →":
  - No active session → build `plannedSets` from template day client-side, POST to `/api/me/workout-logs`, navigate to new session
  - Active session → show conflict dialog (see above)
- No templates → show "Create your first template" empty state with link to `/trainer/plans/new`

### Data flow change in `my-training-landing.tsx`

Remove: `findLastByTemplate`, cycle computation, `exercisePreview`, `plannedSets` server-side.
Keep: `findRecent` (for recent sessions list), template fetch.

---

## Member — Plan Overview

### What changes

- Remove `TODAY_ALREADY_LOGGED` dialog and overwrite logic entirely
- "Log This Workout" button behaviour:
  - No active session → POST `/api/sessions { memberPlanId, dayNumber }`, navigate
  - Active session → show conflict dialog (same pattern as trainer/owner)
- Multiple sessions per day: allowed, no server-side restriction

### What stays the same

- Day tab layout (unchanged)
- Exercise list display (unchanged)
- `ActiveSessionPrompt` banner at top (unchanged — still shows when active session exists)
- Session logging screen (unchanged)

---

## API Changes

### `POST /api/sessions` (member)

```
Remove: findToday blocking, ?overwrite=true, TODAY_ALREADY_LOGGED
Keep:   findActive → if active and same dayNumber → 200 resume (idempotent)
Change: if active and different dayNumber → 409 ACTIVE_SESSION_EXISTS { _id, dayName, setCount, startedAt }
Add:    setCount = session.sets.filter(s => s.completedAt !== null).length in 409 body
```

### `POST /api/me/workout-logs` (trainer/owner)

```
Remove: findToday blocking, ?overwrite=true, TODAY_ALREADY_LOGGED
Keep:   findActive → if active log exists → 409 ACTIVE_SESSION_EXISTS { _id, dayName, setCount, startedAt }
Add:    setCount = log.sets.filter(s => s.completedAt !== null).length in 409 body
```

### `findToday` repository methods

Keep the methods (may be useful for dashboard display later) but remove their usage from POST routes.

---

## Conflict Dialog Spec

Used in: `TemplatePathCard`, `FreestylePathCard`, `PlanOverview`

```
Title:   "[dayName] is still in progress"
Body:    "You have [setCount] set[s] logged. Starting a new session will permanently delete this data."
Button 1 (outline): "Resume [dayName]"  → navigate to /:basePath/session/:id
Button 2 (destructive): "Delete & Start New"  → DELETE session, then POST new, navigate
```

If `setCount === 0`: body changes to "This session has no sets logged yet." (less alarming).

---

## Superseded Docs

- `one-checkin-per-day-design.md` — fully superseded by this doc
- `one-checkin-per-day-plan.md` — superseded (implementation plan for removed feature)
- `my-training-cockpit-design.md` — template card section superseded; recent sessions list, activity strip, and freestyle card sections remain valid
