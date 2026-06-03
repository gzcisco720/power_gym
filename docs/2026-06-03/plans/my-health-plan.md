# My Health (Mobile) Implementation Plan

## Goal
A Member can open the My Health screen on mobile and fully manage three independent health sub-domains — injury records, medications, and medical background — with create, edit, resolve/end, and delete operations backed by JWT-scoped backend endpoints.

## Application
cross-app: `backend/` (new `health` module) + `mobile/` (data layer + screens). No `web/` changes.

## Scope

**In scope:**
- Backend `health` NestJS module: 3 Mongoose models (synced from `web/`), 5 DTOs, service, controller, 10 endpoints, unit + integration tests.
- Member-only JWT auth on all endpoints, scoped to `req.user.sub`.
- Injury delete guarded so only `createdByRole === 'member'` records can be deleted by the member.
- Medical history upsert (PUT) — returns empty defaults when no record exists.
- Mobile data layer: `types/health.ts`, `lib/api/health.api.ts`, `stores/health.store.ts` (three slices) + unit specs.
- Mobile screens: `MyHealthScreen` tab container (Injuries / Medications / Background), three tab components, two bottom sheets (injury, medication), two card components.
- Injuries: active list + collapsible resolved "History" section; create/edit/resolve/reopen/delete.
- Medications: active list + collapsible "Ended" section; create/edit/end/delete.
- Medical Background: single inline form with chronic-conditions chips, dirty detection, save.
- Detox E2E spec covering 3 golden paths + 1 validation error case.
- Replace the `MyHealth` placeholder in navigation with the real screen.

**Out of scope:**
- Any `web/` changes (web already implements this feature).
- Trainer or Owner access to My Health (Member role only).
- Trainer-side injury/medication management on mobile.
- A native date-picker component — date fields use TextInput manual entry (no date-picker dependency exists in `mobile/`).
- Image/photo attachments on health records.
- Push/email reminders for medications or injuries.
- Editing the `createdByRole`/`trainerNotes` fields from mobile (member edits member-facing fields only; trainer notes are read-only display if present).

## Affected Files

**Backend (new):**
- `backend/src/common/models/member-injury.model.ts` (NestJS `@Schema`/`@Prop` style, synced from web schema/enums)
- `backend/src/common/models/member-medication.model.ts`
- `backend/src/common/models/member-medical-history.model.ts`
- `backend/src/modules/health/health.module.ts`
- `backend/src/modules/health/health.controller.ts`
- `backend/src/modules/health/health.service.ts`
- `backend/src/modules/health/dto/create-injury.dto.ts`
- `backend/src/modules/health/dto/update-injury.dto.ts`
- `backend/src/modules/health/dto/create-medication.dto.ts`
- `backend/src/modules/health/dto/update-medication.dto.ts`
- `backend/src/modules/health/dto/update-medical-history.dto.ts`
- `backend/src/modules/health/health.service.spec.ts`
- `backend/src/modules/health/health.controller.spec.ts`
- `backend/test/health.e2e-spec.ts`

**Backend (modify):**
- `backend/src/app.module.ts` — register `HealthModule`

> Convention note: the design spec suggested module-local `models/` under `health/`, but the established backend convention places all Mongoose models in `backend/src/common/models/` using `@Schema()`/`@Prop()` decorators (see `check-in.model.ts`, `body-test.model.ts`). This plan follows the established convention. DTOs use `class-validator` decorators like existing modules.

**Mobile (new):**
- `mobile/src/types/health.ts`
- `mobile/src/lib/api/health.api.ts`
- `mobile/src/lib/api/health.api.spec.ts`
- `mobile/src/stores/health.store.ts`
- `mobile/src/stores/health.store.spec.ts`
- `mobile/src/screens/my-health/MyHealthScreen.tsx`
- `mobile/src/screens/my-health/tabs/InjuriesTab.tsx`
- `mobile/src/screens/my-health/tabs/InjuriesTab.spec.tsx`
- `mobile/src/screens/my-health/tabs/MedicationsTab.tsx`
- `mobile/src/screens/my-health/tabs/MedicationsTab.spec.tsx`
- `mobile/src/screens/my-health/tabs/MedicalBackgroundTab.tsx`
- `mobile/src/screens/my-health/tabs/MedicalBackgroundTab.spec.tsx`
- `mobile/src/screens/my-health/components/InjuryBottomSheet.tsx`
- `mobile/src/screens/my-health/components/MedicationBottomSheet.tsx`
- `mobile/src/screens/my-health/components/InjuryCard.tsx`
- `mobile/src/screens/my-health/components/MedicationCard.tsx`
- `mobile/e2e/member/my-health.spec.ts`

**Mobile (modify):**
- `mobile/src/navigation/index.tsx` — replace `MyHealthScreen` placeholder import with real screen
- `mobile/src/screens/placeholders/index.ts` — remove `MyHealthScreen` export

---

## Stage 1: Backend health module — models, DTOs, service, controller

**Goal**: A running `health` NestJS module exposing all 10 endpoints, Member-only, scoped to `req.user.sub`, with unit + integration tests covering success, auth, role, validation, not-found, and the trainer-injury delete guard.

**Functional units (8):** 3 GET list/single + POST injury + PATCH injury + DELETE injury + POST/PATCH/DELETE medication (grouped) + PUT medical-background. Counted as the 10 endpoints across one controller — within limit because they share one service.

**Endpoints (all `@Roles('member')`, scoped to `req.user.sub`):**
- `GET /health/injuries`, `POST /health/injuries`, `PATCH /health/injuries/:id`, `DELETE /health/injuries/:id`
- `GET /health/medications`, `POST /health/medications`, `PATCH /health/medications/:id`, `DELETE /health/medications/:id`
- `GET /health/medical-background`, `PUT /health/medical-background`

**Sprint Contract**:

*Unit tests (`health.service.spec.ts`, `health.controller.spec.ts`):*
- [ ] `HealthService > findInjuries > returns only injuries whose memberId matches the given user id, sorted by recordedAt desc`
- [ ] `HealthService > createInjury > persists a new injury with status 'active' and createdByRole 'member' for the given user`
- [ ] `HealthService > updateInjury > updates allowed fields and, when status set to 'resolved', sets resolvedAt to a Date`
- [ ] `HealthService > updateInjury > throws NotFoundException when no injury with that id belongs to the user`
- [ ] `HealthService > deleteInjury > throws ForbiddenException when the target injury has createdByRole 'trainer'`
- [ ] `HealthService > deleteInjury > removes the injury when createdByRole is 'member'`
- [ ] `HealthService > createMedication > persists a medication with status 'active' for the given user`
- [ ] `HealthService > updateMedication > sets status to 'ended' and persists endDate when provided`
- [ ] `HealthService > deleteMedication > throws NotFoundException when no medication with that id belongs to the user`
- [ ] `HealthService > getMedicalHistory > returns empty-default shape (chronicConditions: []) when no record exists for the user`
- [ ] `HealthService > saveMedicalHistory > upserts a single record keyed on memberId and returns the saved values`
- [ ] `HealthController > deleteInjury > delegates to service with req.user.sub and the route id`

*Integration / E2E (`backend/test/health.e2e-spec.ts`, full request cycle):*
- [ ] `POST /health/injuries` with valid member JWT and `{ title: "Left knee strain" }` → 201, response body has `_id`, `status: 'active'`, `createdByRole: 'member'`
- [ ] `GET /health/injuries` with no Authorization header → 401
- [ ] `GET /health/injuries` with a non-member (trainer) JWT → 403
- [ ] `POST /health/injuries` with empty body (missing `title`) → 400
- [ ] `PATCH /health/injuries/:id` on an id not owned by the caller → 404
- [ ] `DELETE /health/injuries/:id` where the record has `createdByRole: 'trainer'` → 403; record still present afterward
- [ ] `POST /health/medications` with `{ name, purpose, duration, startDate }` → 201 with `status: 'active'`; then `PATCH /health/medications/:id` `{ status: 'ended' }` → 200 with `status: 'ended'`
- [ ] `GET /health/medical-background` for a user with no record → 200 with `chronicConditions: []` and null fields; then `PUT /health/medical-background` → 200 and a subsequent `GET` returns the saved values

**TDD sequence**:
1. Sync 3 models to `common/models/` as NestJS `@Schema`/`@Prop`, register schemas + `User` in `HealthModule` via `MongooseModule.forFeature`.
2. Write failing service unit tests → Red → implement service methods → Green.
3. Write failing controller unit tests → Red → implement controller (`JwtAuthGuard` + `RolesGuard` + `@Roles('member')`) → Green.
4. Register `HealthModule` in `app.module.ts`.
5. Write `health.e2e-spec.ts` against the real Nest test app + in-memory/seeded Mongo (mirror `check-ins.e2e-spec.ts` bootstrapping) → passes.
6. `/simplify`; ensure `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm build` all green.

**Status**: Complete

---

## Stage 2: Mobile data layer — types, API, Zustand store

**Goal**: Typed `health` API functions calling the Stage 1 endpoints via the existing `apiClient`, plus a Zustand store with three slices (injuries, medications, medical history) — each with loading flags and optimistic-free fetch/mutate actions — covered by unit specs.

**Functional units (3):** types, api layer (10 functions), store (3 slices). Within limit.

**Sprint Contract**:

*Unit tests (`health.api.spec.ts`, `health.store.spec.ts`):*
- [ ] `health.api > getInjuries > calls apiClient with GET '/health/injuries' and returns the parsed array`
- [ ] `health.api > createInjury > calls apiClient with POST '/health/injuries' and the dto as JSON body`
- [ ] `health.api > updateInjury > calls apiClient with PATCH '/health/injuries/:id' and the dto body`
- [ ] `health.api > deleteInjury > calls apiClient with DELETE '/health/injuries/:id'`
- [ ] `health.api > saveMedicalHistory > calls apiClient with PUT '/health/medical-background' and the dto body`
- [ ] `useHealthStore > fetchInjuries > sets injuriesLoading true during the call and populates injuries / clears loading on success`
- [ ] `useHealthStore > addInjury > prepends the returned injury to the injuries array`
- [ ] `useHealthStore > updateInjury > replaces the matching injury in the array by _id`
- [ ] `useHealthStore > deleteInjury > removes the injury with the given _id from the array`
- [ ] `useHealthStore > fetchMedications > populates medications and clears medicationsLoading on success`
- [ ] `useHealthStore > saveMedicalHistory > stores the returned medicalHistory record`

*Integration criteria (store ↔ api wiring, fetch mocked):*
- [ ] `useHealthStore > addMedication → fetchMedications` round trip: after `addMedication` resolves, the new medication is present in `medications` without requiring a manual refetch
- [ ] `useHealthStore > fetchInjuries` when the api rejects → `injuriesLoading` returns to false and the store does not throw (error surfaced, not swallowed silently)

**TDD sequence**:
1. Define `types/health.ts` (Injury, Medication, MedicalHistory + union enums + Create/Update DTO types).
2. Write failing `health.api.spec.ts` (mock `apiClient`/fetch) → Red → implement `health.api.ts` → Green.
3. Write failing `health.store.spec.ts` → Red → implement `health.store.ts` three slices → Green.
4. `/simplify`; ensure `pnpm test` + `pnpm lint` green. No `any`/`unknown`.

**Status**: In Progress

### Stage 2 Checkpoint
- [x] `mobile/src/types/health.ts`
- [x] `mobile/src/lib/api/health.api.ts` + `health.api.spec.ts`
- [x] `mobile/src/stores/health.store.ts` + `health.store.spec.ts`

---

## Stage 3: Mobile My Health screen, tabs, components + Detox E2E

**Goal**: A working `MyHealthScreen` with three tabs replacing the placeholder, each tab driven by the Stage 2 store, with full CRUD interactions through bottom sheets and dialogs, verified by a Detox E2E spec on a real simulator.

**Functional units (7):** MyHealthScreen, InjuriesTab, MedicationsTab, MedicalBackgroundTab, InjuryBottomSheet + InjuryCard (grouped), MedicationBottomSheet + MedicationCard (grouped), nav/placeholder wiring. Within limit.

**Sprint Contract**:

*Unit tests (`InjuriesTab.spec.tsx`, `MedicationsTab.spec.tsx`, `MedicalBackgroundTab.spec.tsx`):*
- [ ] `InjuriesTab > renders active injuries as cards and collapses resolved injuries under a "History" toggle showing the resolved count`
- [ ] `InjuriesTab > shows 3 skeleton rows while injuriesLoading is true`
- [ ] `InjuriesTab > shows an empty-state card with "No active injuries" when there are no active injuries`
- [ ] `InjuriesTab > pressing "Mark resolved" opens a confirmation Dialog and, on confirm, calls store.updateInjury with status 'resolved'`
- [ ] `MedicationsTab > renders active medications and collapses ended ones under an "Ended" toggle with count`
- [ ] `MedicationsTab > pressing "Mark as ended" opens a confirmation Dialog and on confirm calls store.updateMedication with status 'ended'`
- [ ] `MedicalBackgroundTab > Save button is disabled until a field changes (isDirty via JSON.stringify comparison)`
- [ ] `MedicalBackgroundTab > adding a chronic condition renders a removable chip and includes it in the saved payload`
- [ ] `InjuryBottomSheet > submitting with an empty title shows an inline validation error and does not call the create action`

*E2E (Detox — `mobile/e2e/member/my-health.spec.ts`, real simulator):*
- [ ] Golden path Injuries: open drawer → My Health → Injuries tab → "+ Report Injury" → enter title → Save → new injury card appears in the active list → "Mark resolved" → confirm → card moves into the "History" section
- [ ] Golden path Medications: Medications tab → "+ Add Medication" → fill name/purpose/duration/start date → Save → card appears in active list → "Mark as ended" → confirm → card appears under "Ended"
- [ ] Golden path Background: Background tab → edit a field (e.g. Allergies) and add a chronic-condition chip → Save → success toast → navigate away and back → saved values still present
- [ ] Error case: Injuries tab → "+ Report Injury" → Save with empty title → inline validation error shown and the bottom sheet stays open

**TDD sequence**:
1. Build `MyHealthScreen` tab container mirroring `SettingsScreen` (custom Pressable tab bar, `ScreenHeader` with no back button).
2. Write failing `InjuriesTab.spec.tsx` → Red → implement `InjuriesTab` + `InjuryCard` + `InjuryBottomSheet` (reuse `ServiceBottomSheet` pattern) → Green.
3. Repeat for Medications tab + components.
4. Implement `MedicalBackgroundTab` inline form with chips + dirty detection; spec Red → Green.
5. Wire navigation: replace placeholder import in `navigation/index.tsx`, remove `MyHealthScreen` from `placeholders/index.ts`.
6. Write `mobile/e2e/member/my-health.spec.ts`; build + run Detox on the configured simulator → passes.
7. `/simplify`; run design-reviewer on `screens/my-health/`; ensure `pnpm test` + `pnpm lint` green.

**Status**: Not Started

