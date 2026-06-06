# Member Progress Tab (Mobile) Implementation Plan

## Goal
A Trainer or Owner can open a member's detail screen, see a 90-day workout heatmap, select any exercise the member has trained, and view that exercise's last 5 sessions with sets and estimated 1RM.

## Application
cross-app — `backend/` (2 new endpoints) + `mobile/` (data layer, tab UI, Detox E2E)

## Scope
**In scope:**
- Backend `GET /training/members/:memberId/progress` returning `heatmapDates: string[]` (ISO dates of completed sessions, last 90 days) and `exercises: { exerciseId, exerciseName }[]` (distinct exercises the member has trained).
- Backend `GET /training/members/:memberId/exercise/:exerciseId` returning the last 5 sessions for that exercise: `{ sessionId, date, sets: { setNumber, weight, reps }[], estimatedOneRepMax }[]`.
- Server-side Epley 1RM: `1RM = weight × (1 + reps / 30)`, computed per session as the max across that session's logged sets for the exercise.
- Trainer/owner scoping reused from existing `getHistory` (trainer only their own members; owner any member in gym; both throw `NotFoundException` otherwise).
- Mobile types, API client functions, and a Zustand store (`useMemberProgressStore`) keyed by memberId.
- `MemberProgressTab` added to `MemberDetailScreen` tab bar: heatmap grid + horizontal exercise-pill selector + per-exercise history card.
- Detox E2E: trainer views a member's progress, selects an exercise, sees history.

**Out of scope:**
- Member-facing self progress view (the web `progress-client` member view) — unchanged.
- Editing or deleting sessions from this tab.
- Charts/graphs beyond the heatmap grid and the numeric 1RM (no line chart on mobile).
- Trainer logging a session (that is Sprint 4).
- Any change to `GET /training/members/:memberId/history` (keep existing behaviour).
- Pagination/date-range pickers — fixed 90-day heatmap, fixed last-5-session history.

## Affected Files

**Backend — create:**
- `backend/src/modules/training/dto/` — no new DTO needed (params only); confirm none required during implementation.

**Backend — modify:**
- `backend/src/modules/training/training.service.ts` — add `getProgress(memberId, callerId, callerRole)` and `getExerciseHistory(memberId, exerciseId, callerId, callerRole)`; extract the existing member-scope check into a private helper reused by all three methods.
- `backend/src/modules/training/training.controller.ts` — add `GET members/:memberId/progress` and `GET members/:memberId/exercise/:exerciseId`, both `@Roles('owner', 'trainer')`.
- `backend/src/modules/training/training.service.spec.ts` — unit tests for the two new methods + Epley math.
- `backend/src/modules/training/training.controller.spec.ts` — controller delegation tests for the two new methods.
- `backend/test/training.e2e-spec.ts` — integration tests for the two new endpoints (success shape, scoping, auth/role guards).

**Mobile — create:**
- `mobile/src/types/member-progress.ts` — `MemberProgress`, `ExerciseRef`, `ExerciseSessionHistory`, `ExerciseHistorySet` types.
- `mobile/src/lib/api/member-progress.api.ts` — `fetchMemberProgress(memberId)`, `fetchExerciseHistory(memberId, exerciseId)`.
- `mobile/src/stores/member-progress.store.ts` — `useMemberProgressStore`.
- `mobile/src/stores/member-progress.store.spec.ts` — store unit tests.
- `mobile/src/screens/members/tabs/MemberProgressTab.tsx` — the tab component.
- `mobile/src/screens/members/tabs/MemberProgressTab.spec.tsx` — tab unit tests.
- `mobile/e2e/trainer/member-progress.spec.ts` — Detox spec.

**Mobile — modify:**
- `mobile/src/screens/members/MemberDetailScreen.tsx` — add `'progress'` to `TabId`, add a `Progress` entry to `TABS`, render `<MemberProgressTab memberId={memberId} />`.

## Affected response shapes

`GET /training/members/:memberId/progress`:
```json
{
  "heatmapDates": ["2026-06-04", "2026-06-02"],
  "exercises": [{ "exerciseId": "<oid>", "exerciseName": "Back Squat" }]
}
```

`GET /training/members/:memberId/exercise/:exerciseId`:
```json
{
  "exerciseId": "<oid>",
  "exerciseName": "Back Squat",
  "sessions": [
    {
      "sessionId": "<oid>",
      "date": "2026-06-04",
      "sets": [{ "setNumber": 1, "weight": 100, "reps": 5 }],
      "estimatedOneRepMax": 117
    }
  ]
}
```
Notes for the Generator:
- `heatmapDates` = distinct `completedAt` dates (YYYY-MM-DD) of sessions where `completedAt` is within the last 90 days; descending or any order (consumer does not rely on order).
- `exercises` = distinct `{exerciseId, exerciseName}` across all of the member's completed sessions' sets, sorted by `exerciseName` ascending.
- Exercise history: only completed sessions, only sets for that `exerciseId` that have non-null `actualWeight` and `actualReps`; `weight`/`reps` come from `actualWeight`/`actualReps`; `estimatedOneRepMax` = rounded max of `weight × (1 + reps / 30)` across that session's qualifying sets; sessions with no qualifying sets are omitted; limit to the most recent 5 sessions by `completedAt` descending.

---

## Stage 1: Backend — progress + exercise-history endpoints

**Goal**: Two guarded, scoped endpoints returning heatmap dates, exercise list, and per-exercise history with server-computed Epley 1RM.

**Files to create/modify**: `training.service.ts`, `training.controller.ts`, `training.service.spec.ts`, `training.controller.spec.ts`, `backend/test/training.e2e-spec.ts`.

**Dependencies**: None (extends the existing training module).

**Sprint Contract**:

*Unit tests (`training.service.spec.ts`, `training.controller.spec.ts`):*
- [ ] `TrainingService > getProgress > returns distinct YYYY-MM-DD heatmapDates only for sessions completed within the last 90 days` — a session completed 100 days ago is excluded; two sessions on the same day produce one date.
- [ ] `TrainingService > getProgress > returns distinct exercises sorted by exerciseName ascending` — duplicate exerciseIds across sessions collapse to one entry.
- [ ] `TrainingService > getProgress > throws NotFoundException when caller is a trainer not assigned to the member` — asserts the same scoping as `getHistory`.
- [ ] `TrainingService > getExerciseHistory > computes estimatedOneRepMax as round(weight × (1 + reps/30)) taking the session max` — e.g. set 100kg×5 → 117.
- [ ] `TrainingService > getExerciseHistory > returns at most 5 sessions ordered by completedAt descending and omits sessions with no qualifying sets for the exercise` — a 6th-oldest session and a session with only null-weight sets are excluded.
- [ ] `TrainingController > getProgress > delegates to service with memberId, req.user.sub, req.user.role`.
- [ ] `TrainingController > getExerciseHistory > delegates to service with memberId, exerciseId, req.user.sub, req.user.role`.

*Integration (`backend/test/training.e2e-spec.ts`):*
- [ ] `GET /training/members/:memberId/progress` as the member's trainer → 200 with body containing `heatmapDates` array and `exercises` array matching seeded completed sessions.
- [ ] `GET /training/members/:memberId/progress` without a token → 401.
- [ ] `GET /training/members/:memberId/progress` as `member` role → 403 (role guard).
- [ ] `GET /training/members/:memberId/progress` as a trainer NOT assigned to the member → 404.
- [ ] `GET /training/members/:memberId/exercise/:exerciseId` as the member's trainer → 200 with `sessions` array where each item has numeric `estimatedOneRepMax` equal to the Epley value of the seeded sets.
- [ ] `GET /training/members/:memberId/exercise/:exerciseId` as owner → 200 (owner may read any member in gym).

**TDD sequence**:
1. Write failing service + controller unit tests → Red.
2. Implement `getProgress` / `getExerciseHistory` + the shared scope helper + controller routes → Green.
3. Add integration tests against the real Mongo-memory stack → pass.

**Status**: Complete

---

## Stage 2: Mobile data layer — types, API client, store

**Goal**: Typed access to both endpoints through a Zustand store keyed by memberId, with loading/error handling.

**Files to create/modify**: `mobile/src/types/member-progress.ts`, `mobile/src/lib/api/member-progress.api.ts`, `mobile/src/stores/member-progress.store.ts`, `mobile/src/stores/member-progress.store.spec.ts`.

**Dependencies**: Stage 1 (response shapes finalised).

**Store shape** (for the Generator):
```
useMemberProgressStore:
  progressByMember: Record<memberId, MemberProgress>
  historyByExercise: Record<`${memberId}:${exerciseId}`, ExerciseSessionHistory>
  loadingProgress: boolean
  loadingHistory: boolean
  error: string | null
  fetchProgress(memberId): Promise<void>
  fetchExerciseHistory(memberId, exerciseId): Promise<void>
```

**Sprint Contract**:

*Unit tests (`member-progress.store.spec.ts`, mock `../lib/api/member-progress.api`):*
- [ ] `useMemberProgressStore > fetchProgress > populates progressByMember[memberId] and clears loadingProgress on success`.
- [ ] `useMemberProgressStore > fetchProgress > sets error message and clears loadingProgress when the API rejects`.
- [ ] `useMemberProgressStore > fetchExerciseHistory > stores history under the `${memberId}:${exerciseId}` key and clears loadingHistory on success`.
- [ ] `useMemberProgressStore > fetchExerciseHistory > leaves previously fetched exercise histories intact when fetching a new exercise` — asserts no cross-key overwrite.

*Integration (API client, mock `apiClient`):*
- [ ] `member-progress.api > fetchMemberProgress > GETs /training/members/:memberId/progress and returns response.data` — asserts the exact URL and returned shape.
- [ ] `member-progress.api > fetchExerciseHistory > GETs /training/members/:memberId/exercise/:exerciseId and returns response.data`.

**TDD sequence**:
1. Write failing store + api-client unit tests → Red.
2. Implement types, api client, store → Green.
3. Run `cd mobile && pnpm test` for the new specs → pass.

**Status**: Complete

---

## Stage 3: Mobile screen — MemberProgressTab + wiring

**Goal**: A working Progress tab inside MemberDetailScreen: heatmap grid, exercise-pill selector, and per-exercise history card driven by real store data.

**Files to create/modify**: `mobile/src/screens/members/tabs/MemberProgressTab.tsx`, `mobile/src/screens/members/tabs/MemberProgressTab.spec.tsx`, `mobile/src/screens/members/MemberDetailScreen.tsx`.

**Dependencies**: Stage 2.

**UI requirements** (design.md mobile tokens; mirror `MemberTrainingTab` density):
- Section label "Activity (Last 90 Days)" over a heatmap grid: 13-week columns × 7-day rows; each cell `testID="progress-heatmap-cell-<YYYY-MM-DD>"`; cells whose date is in `heatmapDates` use `bg-emerald-500/...`, others `bg-muted`.
- Section label "Exercises"; horizontal `ScrollView` of exercise pills, each `testID="progress-exercise-pill-<exerciseId>"`, selected pill uses `bg-primary` / `text-foreground`, unselected `bg-muted` / `text-foreground/65`.
- On pill select → call `fetchExerciseHistory`; render a history card list, each session `testID="progress-history-session-<sessionId>"` showing date, the sets (`weight × reps`), and `Est. 1RM <value> kg`.
- Loading skeletons (not "Loading…" text); empty state when the member has no completed sessions ("No training activity yet.").

*Unit tests (`MemberProgressTab.spec.tsx`, mock the store):*
- [ ] `MemberProgressTab > renders an emerald heatmap cell for every date in heatmapDates and a muted cell otherwise` — assert by testID + style/class presence.
- [ ] `MemberProgressTab > renders one exercise pill per exercise in the store`.
- [ ] `MemberProgressTab > tapping an exercise pill calls fetchExerciseHistory with memberId and that exerciseId`.
- [ ] `MemberProgressTab > renders session history cards with the Est. 1RM value from the store once an exercise is selected`.
- [ ] `MemberProgressTab > shows the empty state when the member has no completed sessions`.

*E2E (Detox — covered in Stage 4, listed here as the user-facing flow this stage enables):*
- [ ] Trainer opens member detail, taps Progress tab → heatmap and exercise pills render.

**TDD sequence**:
1. Write failing component unit tests → Red.
2. Implement `MemberProgressTab`, wire it into `MemberDetailScreen` (`TabId` + `TABS` + render branch) → Green.
3. Run `cd mobile && pnpm test` → pass. (Detox in Stage 4.)

**Status**: Complete

---

## Stage 4: E2E — Detox spec

**Goal**: Prove the full trainer flow on a real simulator against the live backend.

**Files to create/modify**: `mobile/e2e/trainer/member-progress.spec.ts`.

**Dependencies**: Stages 1–3. Backend must expose a dev seed that creates a trainer with a member who has completed workout sessions (reuse / extend the `seed-user-role` pattern used by `e2e/trainer/members.spec.ts` and the training dev controller).

**Sprint Contract**:

*E2E (Detox, golden path + edge):*
- [ ] Trainer logs in → opens drawer → Members → taps their seeded member card → `screen-MemberDetail` visible → taps `member-detail-tab-progress` → at least one `progress-heatmap-cell-*` is visible.
- [ ] After selecting an exercise: tap a `progress-exercise-pill-*` → a `progress-history-session-*` card becomes visible showing an `Est. 1RM` value.
- [ ] Edge: a member with no completed sessions shows the "No training activity yet." empty state (seed a member with zero sessions, or assert the empty state for a freshly seeded member).

**TDD sequence**:
1. Author the Detox spec following `e2e/trainer/members.spec.ts` structure (seed via `/auth/dev/seed-user-role`, login, drawer nav).
2. Build + run: `cd mobile && pnpm detox build --configuration <config>` then `pnpm detox test --configuration <config> --testPathPattern=trainer/member-progress`.
3. Spec passes against the running backend.

**Status**: Complete
