# My Training — Bug Fixes + Calendar Design

**Date:** 2026-05-11  
**Status:** Approved, ready for implementation

---

## Scope

Five problems to fix in the owner/trainer My Training flow:

1. Multiple completed sessions per day are allowed — should be hard-blocked
2. Multi-tab safety: deleting an active session in another tab causes chaos in the original tab
3. Completed sessions open in logging mode (timer running, Finish button visible)
4. Recent Sessions list has no column headers and "View all" link does nothing
5. Recent Sessions list should be replaced with a calendar experience

---

## 1. One completed session per calendar day (hard gate)

### API — `POST /api/me/workout-logs`

After the existing active-log check, add a second check:

```
const completedToday = await repo.findCompletedToday(guard.userId);
if (completedToday) {
  return Response.json(
    { error: 'DAY_ALREADY_LOGGED', session: { _id: completedToday._id.toString(), dayName: completedToday.dayName } },
    { status: 409 }
  );
}
```

### Repository — `ISelfWorkoutLogRepository`

New method: `findCompletedToday(userId: string): Promise<ISelfWorkoutLog | null>`

Query: `userId == userId && completedAt >= start_of_today_UTC && completedAt < start_of_tomorrow_UTC`

### New UI component — `DayAlreadyLoggedDialog`

```
Title:   "Already trained today"
Body:    "You completed your "{dayName}" session today. Rest up — see you tomorrow!"
Actions: [View session →]  [Got it]
```

- "View session →" is a plain `<a>` link to `${basePath}/session/${session._id}` (hard nav, takes to read-only view)
- "Got it" closes the dialog
- No bypass path — this is a hard block

### UI changes — three entry points

`TemplatePathCard`, `FreestylePathCard`, and `PlanOverview` all call `POST /api/me/workout-logs`. Each needs to handle the new `DAY_ALREADY_LOGGED` 409 alongside the existing `ACTIVE_SESSION_EXISTS` 409:

```typescript
if (body.error === 'DAY_ALREADY_LOGGED') {
  setDayAlreadyLogged({ _id: body.session._id, dayName: body.session.dayName });
}
```

Each component gets a `dayAlreadyLogged: { _id, dayName } | null` state slot and renders `<DayAlreadyLoggedDialog>` when set.

---

## 2. Multi-tab safety — graceful redirect on 404

**File:** `src/components/self-tracking/self-workout-session.tsx`

In `logSet()`, `addSet()`, and `addExercise()`, after `await fetch(...)`:

```typescript
if (res.status === 404) {
  toast.error('This session was ended on another device.');
  router.push(basePath);
  return;
}
```

No other changes needed. The session page detects its own deletion and exits cleanly.

---

## 3. Completed session — read-only mode

**File:** `src/components/self-tracking/self-workout-session.tsx`

After fetching the log, compute:

```typescript
const isCompleted = log.completedAt != null;
```

**When `isCompleted` is true:**

- **Timer replaced** with static duration: `completedAt - startedAt` formatted as `Xh Ym` or `Xm`
- **Header badge:** small "Completed" chip in muted style next to the day name
- **Exercise rows:** pass `mode="readonly"` to `ExerciseRow` — no input fields, no "Complete set" buttons, sets show logged weight × reps or "—" if empty
- **Bottom bar:** replace `<Button>Finish</Button>` with a read-only summary row:
  `Completed {date} · {setCount} sets{rpe ? ` · RPE ${rpe}` : ''}`
- **No "Add Exercise" button** (freestyle check still applies, but hidden when completed)

`ExerciseRow` already has `mode` prop support — confirm `mode="readonly"` renders sets without inputs. If not, add the readonly branch.

---

## 4 & 5. Calendar replaces Recent Sessions

### 4a. Mini month calendar — embedded in My Training landing

**New component:** `src/components/self-tracking/mini-workout-calendar.tsx`  
Client component.

**Props:**
```typescript
interface Props {
  initialLogs: { completedAt: string; hasPR: boolean }[];  // current month completed logs
  initialYear: number;
  initialMonth: number;  // 1-12
  basePath: '/owner/my-training' | '/trainer/my-training';
}
```

**Renders:**
- Section header: `TRAINING HISTORY` (left) + `View calendar →` link to `${basePath}/calendar` (right)
- 7-column month grid (Mon–Sun), weeks as rows
- Each day cell: date number; if has completed log → white dot below number (amber if hasPR)
- Today: date number in white circle
- Future dates: muted, non-interactive
- No click interaction — dots are display-only; all detail is in the full calendar

**Data:** Server fetches `monthLogs` in `my-training-landing.tsx` (already done for ActivityStrip). Pass the same data down. No new API call needed for the initial render. Component shows only `completedAt != null` logs.

**Month navigation:** Not needed for the mini calendar — it's a snapshot of this month only. The full calendar handles navigation.

**Changes to `my-training-landing.tsx`:**
- Remove `<RecentSessionsList>` and its `sessions` / `state` props
- Add `<MiniWorkoutCalendar initialLogs={...} initialYear={year} initialMonth={month} basePath={basePath} />`

### 4b. Full calendar page

**New routes:**
- `src/app/(dashboard)/owner/my-training/calendar/page.tsx`
- `src/app/(dashboard)/trainer/my-training/calendar/page.tsx`

Both render `<SelfWorkoutCalendarClient basePath="..." />`.

**New component:** `src/components/self-tracking/self-workout-calendar-client.tsx`  
Client component. Modeled after `calendar-client.tsx` but simplified.

**Props:**
```typescript
interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training';
}
```

**Behavior:**
- Manages `weekStart` state (Monday of displayed week)
- Prev/Next/Today navigation buttons
- On mount + on weekStart change: fetch `GET /api/me/workout-logs/range?start=ISO&end=ISO`
- Renders `SelfWeekCalendarGrid` with fetched logs as events
- Clicking an event → navigate to `${basePath}/session/${log._id}` (read-only if completed)

**New API endpoint:** `GET /api/me/workout-logs/range`

Query params: `start` (ISO date), `end` (ISO date). Returns completed and active logs in the range.

Response shape:
```typescript
{
  logs: {
    _id: string;
    dayName: string;
    startedAt: string;
    completedAt: string | null;
    setCount: number;
    rpe: number | null;
    hasPR: boolean;
  }[]
}
```

**New component:** `src/components/self-tracking/self-week-calendar-grid.tsx`  
Simplified version of `week-calendar-grid.tsx`. Differences:
- No trainer colors — use a single accent color (white/muted for completed, blue for active)
- Event card shows: `dayName`, time range, set count
- No slot-click to create (read-only calendar)
- Same 30-min slot grid, 6 AM–10 PM, Mon–Sun layout

---

## Summary of new/modified files

| File | Change |
|------|--------|
| `src/lib/repositories/self-workout-log.repository.ts` | Add `findCompletedToday()` |
| `src/app/api/me/workout-logs/route.ts` | Check `DAY_ALREADY_LOGGED` |
| `src/app/api/me/workout-logs/range/route.ts` | New endpoint |
| `src/components/self-tracking/day-already-logged-dialog.tsx` | New component |
| `src/components/self-tracking/self-workout-session.tsx` | 404 guard + read-only mode |
| `src/components/self-tracking/template-path-card.tsx` | Handle `DAY_ALREADY_LOGGED` |
| `src/components/self-tracking/freestyle-path-card.tsx` | Handle `DAY_ALREADY_LOGGED` |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Handle `DAY_ALREADY_LOGGED` |
| `src/components/self-tracking/my-training-landing.tsx` | Replace RecentSessionsList with MiniWorkoutCalendar |
| `src/components/self-tracking/mini-workout-calendar.tsx` | New component |
| `src/components/self-tracking/self-workout-calendar-client.tsx` | New component |
| `src/components/self-tracking/self-week-calendar-grid.tsx` | New component |
| `src/app/(dashboard)/owner/my-training/calendar/page.tsx` | New page |
| `src/app/(dashboard)/trainer/my-training/calendar/page.tsx` | New page |

---

## Out of scope

- Member plan: member already has a dedicated session calendar at `/member/plan/calendar`. No changes to member flow.
- Editing or deleting past completed sessions (read-only history only).
- Cross-day navigation within the mini calendar (single month snapshot).
