# Mobile Phase 2 — Design Spec

**Date:** 2026-06-06  
**Scope:** 4 new mobile features bringing `mobile/` + `backend/` to full web parity.  
**Reference:** Web app at `web/src/app/(dashboard)/` implements all 4 features.

---

## Context

All 16 Phase 1 roadmap features are complete (Foods Library excluded from Phase 1 as food *management* was out of scope then). These 4 features complete the feature gap between web and mobile.

---

## Sprint 1 — Foods Library

### Goal
Owner and Trainer can manage the shared food database: search, create, edit, and delete food items. The food database underlies nutrition templates and daily logging.

### Backend gap
`foods` module currently has:
- `GET /foods` — search (owner + trainer)
- `POST /foods` — create (owner + trainer)

Missing:
- `PATCH /foods/:id` — update a food item (owner/trainer, scoped to their gym)
- `DELETE /foods/:id` — delete a food item (owner/trainer, scoped to their gym)

### Mobile screens

**FoodsScreen** (drawer nav item `Foods` for Owner + Trainer)
- Search bar with debounce (300ms), clear button, loading spinner
- List of FoodCard items: name, brand, macros per 100g (kcal / P / C / F as MacroPills)
- Swipe-to-delete or delete icon → confirm dialog
- FAB / header `+` button → FoodFormScreen (create)
- Tapping a card → FoodFormScreen (edit)
- Empty state when no results

**FoodFormScreen** (stack screen, create + edit modes)
- Fields: Name (required), Brand (optional), kcal/protein/carbs/fat per 100g (required), optional servings list (label + grams)
- Sticky bottom Save button, disabled until dirty + valid
- Header back button with unsaved-changes guard

### Navigation
- Added to `NAV_CONFIG` under Owner `TEMPLATES` group and Trainer `TEMPLATES` group
- Stack screen `FoodForm` added to `AppStackParamList`

### Data layer
- `FoodItem` type, `FoodStore` with `items`, `loading`, `search(q)`, `create(dto)`, `update(id, dto)`, `delete(id)`
- API client: `GET /foods`, `POST /foods`, `PATCH /foods/:id`, `DELETE /foods/:id`

### Stages
1. Backend: `PATCH` + `DELETE` endpoints, service methods, unit + integration tests
2. Mobile data: types, API client, Zustand store + unit tests
3. Mobile screens: FoodsScreen + FoodFormScreen + navigation wiring + unit tests
4. E2E: Detox specs — owner (CRUD golden path + empty state), trainer (CRUD golden path)

---

## Sprint 2 — Member Check-ins Tab

### Goal
Trainer and Owner can view a member's check-in history from within MemberDetailScreen. Tapping a check-in opens the existing CheckInDetailScreen (read-only).

### Backend gap
`check-ins` module currently only allows `@Roles('member')`. Need trainer/owner read access.

New endpoints:
- `GET /check-ins/members/:memberId` — list member's check-ins (owner/trainer, scoped)
- `GET /check-ins/members/:memberId/:id` — single check-in detail (owner/trainer, scoped)

Scoping rule: trainer can only read check-ins for members assigned to them; owner can read any member in their gym.

### Mobile screens

**MemberCheckInsTab** (new tab in MemberDetailScreen)
- Tab label: "Check-ins"
- Scrollable list of CheckInCard items: date, wellness scores summary (sleep/energy/stress)
- Loading skeleton, empty state
- Tap → navigate to existing `CheckInDetail` stack screen (pass `checkIn` param)

**CheckInDetailScreen** (already implemented — reuse as read-only for trainer/owner view)
- No code changes needed to the screen; navigation just passes the full check-in object

### Navigation
- Add `CheckIns` tab to MemberDetailScreen tab list (after Health tab)
- Reuse existing `CheckInDetail` AppStack screen

### Data layer
- Extend `MemberStore` (or new `memberCheckInsStore`) with `checkIns`, `loadingCheckIns`, `fetchMemberCheckIns(memberId)`
- API client: `GET /check-ins/members/:memberId`

### Stages
1. Backend: 2 new guarded endpoints + service methods + unit + integration tests
2. Mobile: MemberCheckInsTab + data layer + navigation wiring + unit tests
3. E2E: Detox specs — trainer views member check-ins, taps detail

---

## Sprint 3 — Member Progress Tab

### Goal
Trainer and Owner see a member's training progress: 90-day workout heatmap and a per-exercise history (most recent sets + estimated 1RM).

### Backend gap
`GET /training/members/:memberId/history` exists but returns raw session list. Need a dedicated progress endpoint.

New endpoint:
- `GET /training/members/:memberId/progress` — returns:
  - `heatmapDates: string[]` — ISO dates of completed sessions (last 90 days)
  - `exercises: { exerciseId, exerciseName }[]` — all exercises the member has trained
  - Selected exercise detail fetched separately via existing history or a new sub-endpoint

Design decision: heatmap data is fetched eagerly (small array of dates). Exercise history (sets per session) is fetched on-demand when user selects an exercise.

Add: `GET /training/members/:memberId/exercise/:exerciseId` — returns last N sessions for that exercise (date, sets with weight/reps, estimated 1RM via Epley formula).

### Mobile screens

**MemberProgressTab** (new tab in MemberDetailScreen)
- **Heatmap section**: 13-week grid (Mon–Sun columns), cells colored by completion. Tap cell → show date tooltip.
- **Exercise History section**: horizontal scroll of exercise pills → select one → card shows last 5 sessions with sets and estimated 1RM

### Data layer
- `MemberProgress` type, `memberProgressStore` (or extend MemberStore)
- API client: `GET /training/members/:memberId/progress`, `GET /training/members/:memberId/exercise/:exerciseId`

### Stages
1. Backend: 2 new endpoints + service methods + unit + integration tests
2. Mobile data: types, API client, store + unit tests
3. Mobile screens: MemberProgressTab (heatmap + exercise selector + history card) + unit tests
4. E2E: Detox specs — trainer views member progress, selects an exercise

---

## Sprint 4 — Trainer Log for Member

### Goal
Trainer (and Owner) can log a workout session on behalf of a member. The flow mirrors the existing member WorkoutSession experience but operates under the trainer's auth token against member-scoped endpoints.

### Backend gap
All training session endpoints are `@Roles('member')` only. Need parallel trainer-facing endpoints.

New endpoints:
- `GET /training/members/:memberId/plan` — trainer reads member's active plan (same data as `GET /training/my-plan` but for a specific member)
- `POST /training/members/:memberId/sessions` — trainer starts a session for member (returns WorkoutSession)
- `PATCH /training/members/:memberId/sessions/:id/sets` — trainer logs a set
- `POST /training/members/:memberId/sessions/:id/finish` — trainer finishes session

All endpoints: `@Roles('owner', 'trainer')`, scoped (trainer can only access their own members).

The existing `GET /training/members/:memberId/history` and `POST /training/members/:memberId/assign-plan` are already implemented.

### Mobile screens

**MemberTrainingTab** (existing tab — add "Log Session" button)
- If member has an active plan: show "Log Session" button next to assigned plan name
- Tap → navigate to `TrainerWorkoutSession` stack screen

**TrainerWorkoutSessionScreen** (new stack screen)
- Same UI as `WorkoutSessionScreen` but:
  - Header shows member's name (not "My Training")
  - Uses trainer-facing API endpoints
  - `memberId` passed as route param

### Navigation
- New stack screen `TrainerWorkoutSession: { memberId: string; memberName: string }` added to `AppStackParamList`

### Data layer
- Extend `trainingStore` with trainer-log actions: `fetchMemberPlan(memberId)`, `startMemberSession(memberId, dayNumber)`, `patchMemberSet(memberId, sessionId, dto)`, `finishMemberSession(memberId, sessionId)`

### Stages
1. Backend: 4 new guarded endpoints + service methods + unit + integration tests
2. Mobile data: extend training store with trainer-log actions + unit tests
3. Mobile screens: "Log Session" button in MemberTrainingTab + TrainerWorkoutSessionScreen + navigation
4. E2E: Detox specs — trainer logs a session for a member end-to-end

---

## Ordering Rationale

| Sprint | Complexity | Dependencies |
|---|---|---|
| 1 — Foods Library | Medium | Self-contained |
| 2 — Member Check-ins Tab | Low | Reuses existing screens |
| 3 — Member Progress Tab | Medium | Independent |
| 4 — Trainer Log for Member | High | Most new backend + most new mobile code |

Sprint 4 should not start until Sprint 3 is complete — Sprints 1–3 are otherwise independent of each other.
