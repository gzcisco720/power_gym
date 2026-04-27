# Progress Charts & Analytics Design

**Date**: 2026-04-28  
**Status**: Approved

---

## Goal

Give members a dedicated page to visualise their training consistency (heatmap) and strength progress (1RM trend per exercise). Give trainers the same view inside each member's detail pages.

---

## Architecture

Server components load static data (heatmap dates, exercise list) at render time. The exercise-specific 1RM history is fetched client-side on demand to avoid a large initial payload. A single new API route handles the on-demand fetch. Repository methods are added to `IWorkoutSessionRepository` — no new models or schemas required.

**Tech stack additions**: Recharts (already used in `body-test-viewer`), custom div-grid for heatmap (no extra library).

---

## Data Layer

Three new methods on `IWorkoutSessionRepository` and `MongoWorkoutSessionRepository`:

### `findCompletedDates(memberId: string, since: Date): Promise<Date[]>`

Returns the `completedAt` timestamps of all workout sessions for the member completed on or after `since`. Sessions where `completedAt` is `null` are excluded. Used to build the heatmap.

### `findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]>`

MongoDB aggregate: `$unwind` sets → `$match` (actualWeight ≠ null, actualReps ≠ null) → `$group` by exerciseId → sorted by exerciseName ascending. Returns distinct exercises the member has logged at least one valid set for.

### `findExerciseHistory(memberId: string, exerciseId: string): Promise<{ date: Date; estimatedOneRM: number }[]>`

For each WorkoutSession belonging to the member, finds sets matching `exerciseId` with non-null weight and reps, computes `estimatedOneRM` (Epley formula from `src/lib/training/epley.ts`) for each set, takes the per-session maximum, and returns `[{ date, estimatedOneRM }]` sorted ascending by date. The `date` field is `completedAt ?? startedAt`. Sessions with no matching completed sets are skipped.

---

## API

### `GET /api/progress/[memberId]?exerciseId=<id>`

**Auth rules:**
| Role | Allowed |
|------|---------|
| Member | Only if `memberId === session.user.id` |
| Trainer | Only if the member's `trainerId === session.user.id` |
| Owner | Any member |

**Responses:**

| Case | Status | Body |
|------|--------|------|
| Not authenticated | 401 | `{ error: 'Unauthorized' }` |
| Role check fails | 403 | `{ error: 'Forbidden' }` |
| Missing `exerciseId` | 400 | `{ error: 'exerciseId is required' }` |
| Member not found | 404 | `{ error: 'Member not found' }` |
| Success | 200 | `{ history: [{ date: string; estimatedOneRM: number }] }` |

`date` is an ISO date string (`YYYY-MM-DD`). `estimatedOneRM` is rounded to one decimal place.

---

## Pages & Components

### New files

```
src/app/(dashboard)/member/progress/
  page.tsx
  _components/
    progress-client.tsx

src/app/(dashboard)/trainer/members/[id]/progress/
  page.tsx

src/app/api/progress/[memberId]/
  route.ts

src/lib/repositories/
  workout-session.repository.ts   (modified — add 3 methods)

src/components/shared/
  app-shell.tsx                   (modified — add member nav entry)
```

### `member/progress/page.tsx` (server component)

1. Auth check — redirect if no session.
2. Call `findCompletedDates(memberId, since90Days)` and `findTrainedExercises(memberId)`.
3. Build `heatmapData: { date: string }[]` (ISO date strings, last 90 days that had a session).
4. Render `<PageHeader title="My Progress" />` + `<ProgressClient>`.

### `trainer/members/[id]/progress/page.tsx` (server component)

Same as above but:
- Auth checks that `session.user.role === 'trainer'` and `member.trainerId === session.user.id`.
- Passes `memberId` of the viewed member (not the trainer's own id).

### `ProgressClient` (client component)

**Props:**
```typescript
interface ProgressClientProps {
  heatmapData: { date: string }[]
  exercises: { exerciseId: string; exerciseName: string }[]
  memberId: string
}
```

**Layout (top to bottom):**

1. **Heatmap** — custom div grid, 13 columns (weeks) × 7 rows (days), covering the last 91 days. Days with a session: `#2563eb`. Days without: `#1a1a1a`. Month labels above each column where the month changes. Rendered with static JSX (no library).

2. **Exercise selector** — native `<select>` styled to match project conventions (dark background, border). Default: first exercise in list, or a placeholder "Select an exercise" if list is empty.

3. **1RM chart** — Recharts `<LineChart>` with `<Line>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<ResponsiveContainer>`. X axis: `date` (formatted `MMM d`). Y axis: `estimatedOneRM` (kg). When no exercise is selected or history is empty: shows an empty-state message ("No history yet for this exercise"). Fetches `GET /api/progress/[memberId]?exerciseId=xxx` on exercise change; shows a loading indicator (opacity dimming) during fetch.

### Navigation updates (`app-shell.tsx`)

Member TRAINING group — insert after Personal Bests:
```typescript
{ href: '/member/progress', label: 'My Progress' }
```

Trainer member list (`src/app/(dashboard)/trainer/members/page.tsx`) — add a `Progress →` link to each member card alongside the existing `Plan →`, `Body Tests →`, and `Nutrition →` links. There is no shared tab component between sub-pages; the trainer returns to the members list to switch views.

---

## Testing

### Unit / Integration (Jest)

**`__tests__/lib/repositories/workout-session-progress.test.ts`** (new file to keep existing test file focused):

- `findCompletedDates`: returns dates on/after `since`; excludes `completedAt: null`; returns empty array when no sessions
- `findTrainedExercises`: deduplicates by exerciseId; excludes sets with null weight or reps; returns empty array when no valid sets
- `findExerciseHistory`: computes max 1RM per session correctly; sorts ascending; skips sessions with no matching sets; uses Epley formula

**`__tests__/app/api/progress.test.ts`** (new file):

- Unauthenticated → 401
- Member queries another member's data → 403
- Trainer queries a member belonging to a different trainer → 403
- Owner queries any member → 200
- Missing `exerciseId` → 400
- Member not found → 404
- Valid request → 200 with correct history array

### E2E (Playwright)

**Seed addition**: one extra `WorkoutSession` for Test Member with a completed Bench Press set (actualWeight=60, actualReps=8, completedAt set) — so the exercise list is non-empty and the heatmap has at least one coloured cell.

**`e2e/member/progress.spec.ts`** (new file):
- Navigate to `/member/progress` → heatmap is visible
- Select "Bench Press" from the exercise dropdown → chart appears with at least one data point

**`e2e/trainer/members.spec.ts`** (add one case):
- Trainer navigates to member detail → clicks Progress → heatmap is visible
