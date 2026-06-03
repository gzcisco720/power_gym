# Trainers (Mobile, Phase 3) Implementation Plan

## Goal
An Owner on mobile can browse the full list of trainers and drill into any trainer to see overview stats and that trainer's assigned members.

## Application
cross-app: `backend/` (new trainers module) + `mobile/` (data layer + screens). No `web/` changes.

## Scope
**In scope:**
- `backend/`: new `trainers` module with two Owner-only endpoints — `GET /trainers` (list with computed memberCount) and `GET /trainers/:id` (detail with member list).
- `mobile/`: trainers type definitions, API layer, Zustand store.
- `mobile/`: `TrainersScreen` (replace placeholder) — Owner-only list of trainers with avatar initials, name, email, member count.
- `mobile/`: `TrainerDetailScreen` (NEW stack screen) — header (name, email) + custom Pressable tab bar with Overview tab (member count, join date) and Members tab (read-only member list).
- `mobile/`: register `TrainerDetail` in `AppStackParamList` and `AppNavigator`.
- `mobile/`: reuse `MemberRow` component from the parallel Members feature at `mobile/src/screens/members/components/MemberRow.tsx`.
- Detox E2E for the Owner trainers flow.

**Out of scope:**
- Editing trainers, assigning members, creating/deleting trainers (read-only feature).
- Training plans / nutrition plans / calendar tabs on trainer detail (web has these; mobile Phase 3 only ships Overview + Members).
- Trainer-role or Member-role access to any of these screens — Owner only.
- Any `web/` change.
- Search / filter / pagination on the trainer list.

## Affected Files

### `backend/`
- `backend/src/modules/trainers/trainers.module.ts` — NEW
- `backend/src/modules/trainers/trainers.controller.ts` — NEW
- `backend/src/modules/trainers/trainers.controller.spec.ts` — NEW (unit)
- `backend/src/modules/trainers/trainers.service.ts` — NEW
- `backend/src/modules/trainers/trainers.service.spec.ts` — NEW (unit)
- `backend/src/modules/trainers/dto/trainer-response.types.ts` — NEW (response shape interfaces)
- `backend/src/app.module.ts` — MODIFY (register `TrainersModule`)
- `backend/test/trainers.e2e-spec.ts` — NEW (integration)

### `mobile/`
- `mobile/src/types/trainers.ts` — NEW
- `mobile/src/lib/api/trainers.api.ts` — NEW
- `mobile/src/lib/api/trainers.api.spec.ts` — NEW (unit)
- `mobile/src/stores/trainers.store.ts` — NEW
- `mobile/src/stores/trainers.store.spec.ts` — NEW (unit)
- `mobile/src/screens/trainers/TrainersScreen.tsx` — NEW
- `mobile/src/screens/trainers/TrainersScreen.spec.tsx` — NEW (unit)
- `mobile/src/screens/trainers/TrainerDetailScreen.tsx` — NEW
- `mobile/src/screens/trainers/TrainerDetailScreen.spec.tsx` — NEW (unit)
- `mobile/src/screens/trainers/components/TrainerRow.tsx` — NEW
- `mobile/src/screens/trainers/components/TrainerOverviewTab.tsx` — NEW
- `mobile/src/screens/trainers/components/TrainerMembersTab.tsx` — NEW
- `mobile/src/navigation/index.tsx` — MODIFY (drop `TrainersScreen` from placeholders import; import real `TrainersScreen`; add `TrainerDetailScreen`; add `TrainerDetail` to `AppStackParamList`; register in `AppNavigator`; update `SCREEN_REGISTRY`)
- `mobile/src/screens/placeholders/index.ts` — MODIFY (remove the `TrainersScreen` placeholder export)
- `mobile/e2e/owner/trainers.spec.ts` — NEW (Detox)

### Dependency note
- `MemberRow` at `mobile/src/screens/members/components/MemberRow.tsx` is produced by the parallel Members plan. The Members tab reuses it. If it does not yet exist when Stage 3 starts, that is a blocker — raise it; do not duplicate the component.

---

## Stage 1: Backend trainers module

**Goal**: Two Owner-only endpoints — `GET /trainers` returning every trainer with computed `memberCount`, and `GET /trainers/:id` returning trainer detail plus that trainer's member list. Guarded against non-owner roles.

**Data shapes** (defined in `dto/trainer-response.types.ts`):
```ts
interface TrainerListItem { id: string; name: string; email: string; memberCount: number; }
interface TrainerMember { id: string; name: string; email: string; }
interface TrainerDetailResponse {
  id: string; name: string; email: string;
  memberCount: number; joinDate: string; // ISO string from createdAt
  members: TrainerMember[];
}
```
- `name` = `${firstName} ${lastName}`.
- `memberCount` / `members` = users where `role === 'member'` and `trainerId === trainer._id`.
- `joinDate` = trainer's `createdAt`.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainersService > findAll > returns all role='trainer' users mapped to {id, name, email, memberCount}` — asserts only trainers (not owners/members) are returned and each has correct memberCount counted from the User collection by trainerId.
- [ ] `TrainersService > findAll > returns memberCount of 0 for a trainer with no assigned members` — asserts trainers with zero members still appear with memberCount 0.
- [ ] `TrainersService > findOne > returns trainer detail with members list, joinDate, and memberCount` — asserts shape including ISO joinDate from createdAt and members array of {id, name, email}.
- [ ] `TrainersService > findOne > throws NotFoundException when id is not a trainer` — asserts a member or owner id (or unknown id) raises NotFoundException.
- [ ] `TrainersController > findAll > delegates to service.findAll and returns its result` — asserts controller returns the service value.
- [ ] `TrainersController > findOne > delegates to service.findOne with the route id` — asserts the param id is passed through.

*Integration (`backend/test/trainers.e2e-spec.ts`):*
- [ ] Owner `GET /trainers` → 200 with an array where each item has `id, name, email, memberCount` and memberCount matches seeded assignments (e.g. trainer with 2 assigned members returns memberCount 2).
- [ ] Owner `GET /trainers/:id` → 200 with `id, name, email, memberCount, joinDate, members[]` where members contains exactly the seeded members for that trainer.
- [ ] Owner `GET /trainers/:id` with a non-trainer id → 404.
- [ ] Member (or trainer) `GET /trainers` → 403 (RolesGuard rejects non-owner).
- [ ] Unauthenticated `GET /trainers` → 401 (JwtAuthGuard rejects missing token).

**TDD sequence**:
1. Write failing service + controller unit tests → Red
2. Implement `TrainersService`, `TrainersController`, DTO types, `TrainersModule`; register module in `app.module.ts` → Green
3. Write `trainers.e2e-spec.ts` (mirror `equipment.e2e-spec.ts` buildApp/auth helpers, seed an owner, two trainers, and members assigned to one trainer) → passes against in-memory Mongo

**Status**: Complete

### Stage 1 Checkpoint
- [x] `trainers.service.spec.ts` — service unit tests
- [x] `trainers.controller.spec.ts` — controller unit tests
- [x] Implementation (`TrainersService`, `TrainersController`, DTO, `TrainersModule`, `app.module.ts`)
- [x] `trainers.e2e-spec.ts` — integration tests

---

## Stage 2: Mobile data layer

**Goal**: Trainers types, API functions, and a Zustand store the screens consume. No UI yet.

**`mobile/src/types/trainers.ts`** mirrors the backend response shapes: `TrainerListItem`, `TrainerMember`, `TrainerDetail`.

**`mobile/src/lib/api/trainers.api.ts`**: `fetchTrainers(): Promise<TrainerListItem[]>` (GET `/trainers`) and `fetchTrainerDetail(id: string): Promise<TrainerDetail>` (GET `/trainers/:id`), using `apiClient` exactly like `equipment.api.ts`.

**`mobile/src/stores/trainers.store.ts`**: list state (`trainers`, `loading`, `error`, `fetchTrainers`) plus detail state (`detail`, `detailLoading`, `detailError`, `fetchTrainerDetail(id)`), following the `equipment.store.ts` set/try/catch pattern.

**Sprint Contract**:

*Unit tests:*
- [ ] `trainers.api > fetchTrainers > calls apiClient.get('/trainers') and returns response.data` — asserts URL and returned payload (mock apiClient).
- [ ] `trainers.api > fetchTrainerDetail > calls apiClient.get('/trainers/:id') with the given id and returns response.data` — asserts the interpolated URL.
- [ ] `useTrainersStore > fetchTrainers > populates trainers and sets loading false on success` — asserts state after resolve.
- [ ] `useTrainersStore > fetchTrainers > sets error message and loading false on failure` — asserts error is captured, trainers unchanged.
- [ ] `useTrainersStore > fetchTrainerDetail > populates detail and clears detailLoading on success` — asserts detail state after resolve.
- [ ] `useTrainersStore > fetchTrainerDetail > sets detailError and clears detailLoading on failure` — asserts error path for the detail fetch.

*Integration / E2E:*
- [ ] (covered by Stage 3 Detox) — this is a pure data-layer stage; the two store fetch flows are exercised end-to-end through the screens in Stage 3.

**TDD sequence**:
1. Write failing api + store unit tests (mock `apiClient` like `equipment.api.spec.ts`) → Red
2. Implement types, api, store → Green
3. No UI/E2E in this stage; the real-stack proof is Stage 3's Detox spec hitting the live backend from Stage 1.

**Status**: Complete

### Stage 2 Checkpoint
- [x] `mobile/src/types/trainers.ts` — type definitions
- [x] `mobile/src/lib/api/trainers.api.ts` + `trainers.api.spec.ts`
- [x] `mobile/src/stores/trainers.store.ts` + `trainers.store.spec.ts`

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: Owner sees a real Trainers list, taps a trainer to push `TrainerDetailScreen`, switches between Overview and Members tabs. Placeholder removed; navigation wired.

**TrainersScreen**: header "Trainers" + subtitle; on mount `fetchTrainers()`; skeleton rows while loading; empty state when none; one `TrainerRow` per trainer. `TrainerRow` shows avatar initials (first letters of first+last name), name, email, and member count, laid out `flex-row items-center justify-between` per density rules. Row press → `navigation.navigate('TrainerDetail', { trainerId, trainerName })`.

**TrainerDetailScreen**: pushed stack screen. `ScreenHeader` title = trainer name with back button; sub-line shows email. On mount `fetchTrainerDetail(trainerId)`. Custom Pressable tab bar (mirror `EquipmentDetailScreen` tab pattern) with two tabs:
- Overview (`TrainerOverviewTab`): member count and join date (formatted from ISO `joinDate`).
- Members (`TrainerMembersTab`): read-only list rendering reused `MemberRow` for each `detail.members`; empty state when the trainer has no members.

**Navigation wiring**: import real `TrainersScreen`; remove `TrainersScreen` from placeholders import and from `placeholders/index.ts`; add `TrainerDetail: { trainerId: string; trainerName: string }` to `AppStackParamList`; register `<AppStack.Screen name="TrainerDetail" .../>`; update `SCREEN_REGISTRY.Trainers` to the real screen.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainerRow > renders name, email, memberCount and avatar initials` — asserts initials derive from first+last name and all fields render.
- [ ] `TrainersScreen > calls fetchTrainers on mount and renders a TrainerRow per trainer` — asserts store fetch invoked and N rows render for N trainers (mock store).
- [ ] `TrainersScreen > renders empty state when trainers list is empty` — asserts empty-state copy renders, no rows.
- [ ] `TrainerDetailScreen > calls fetchTrainerDetail with route trainerId on mount` — asserts fetch called with the passed id.
- [ ] `TrainerDetailScreen > Overview tab shows memberCount and formatted joinDate` — asserts Overview content from detail state.
- [ ] `TrainerDetailScreen > tapping Members tab renders a MemberRow per detail member` — asserts switching tab renders reused MemberRow for each member.

*E2E (Detox — `mobile/e2e/owner/trainers.spec.ts`, mirror `owner/equipment.spec.ts` setup):*
- [ ] Golden path: Owner logs in → opens drawer → taps Trainers → sees seeded trainer row with name/email/member count → taps the row → `TrainerDetailScreen` shows trainer name in header → Overview tab shows member count → taps Members tab → seeded member appears in the list → back returns to the Trainers list.
- [ ] Edge case: opening a trainer that has zero assigned members → Members tab shows the empty state (no member rows) while Overview shows member count 0.

**TDD sequence**:
1. Write failing component unit tests (RTL, mock `useTrainersStore` and navigation) → Red
2. Implement `TrainerRow`, `TrainersScreen`, `TrainerOverviewTab`, `TrainerMembersTab`, `TrainerDetailScreen`; wire navigation and remove placeholder → Green
3. Write/run `mobile/e2e/owner/trainers.spec.ts` against a booted simulator + live backend (Stage 1) seeded with an owner, a trainer with members, and a trainer with none → passes
4. Refactor (`/simplify`) and run `design-reviewer` on the new screens before marking complete

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `TrainerRow` component + unit test
- [x] `TrainersScreen` + unit test
- [x] `TrainerOverviewTab` + `TrainerMembersTab` + `TrainerDetailScreen` + unit tests
- [x] Navigation wiring + placeholder removal
- [x] `mobile/e2e/owner/trainers.spec.ts` — Detox E2E

---

## Architectural Risks
- **MemberRow dependency**: Stage 3 depends on `mobile/src/screens/members/components/MemberRow.tsx` from the parallel Members plan. If Members has not landed when Stage 3 starts, this is a hard blocker — do not duplicate the component; raise it.
- **Placeholder removal coupling**: `TrainersScreen` is currently a cached placeholder shared via `placeholders/index.ts` and `SCREEN_REGISTRY`. Removing it touches navigation wiring used by the drawer; ensure the real screen keeps `testID="screen-Trainers"` so existing drawer/nav specs still pass.
- **createdAt availability**: `joinDate` relies on `User` timestamps (`createdAt: true` is set on the schema) — confirmed present; no model change needed.
