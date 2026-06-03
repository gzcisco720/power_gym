# Training Templates (Mobile, Phase 3) Implementation Plan

## Goal
Owner and Trainer can create, view, edit, and delete their own workout plan templates (days + exercises grouped by supersets) from the mobile app, backed by new `backend/` endpoints.

## Application
cross-app — `backend/` (NestJS API: plan-templates + exercises modules) and `mobile/` (data layer + screens + Detox E2E). No `web/` changes.

## Scope
**In scope:**
- Backend `plan-templates` module: `GET /plan-templates` (own), `POST /plan-templates`, `PATCH /plan-templates/:id` (full days replace), `DELETE /plan-templates/:id`. Roles: owner, trainer. Ownership enforced via `createdBy = req.user.sub`.
- Backend `exercises` module: `GET /exercises?q=<string>` (global + own, case-insensitive name search), `POST /exercises` (custom: name, muscleGroup, isBodyweight). Roles: owner, trainer.
- New Mongoose models in `backend/src/common/models/`: `PlanTemplate` (name, description, createdBy, days[]) and `Exercise` (name, muscleGroup, isGlobal, createdBy, isBodyweight) — schemas kept in sync with the existing `web/` models.
- Dev-only seed controller for E2E (mirrors `body-tests.dev.controller.ts` pattern): seed a known global exercise so the picker is never empty.
- Mobile data layer: `types/training-templates.ts`, `lib/api/training-templates.api.ts`, `lib/api/exercises.api.ts`, `stores/training-templates.store.ts`, `stores/exercises.store.ts`.
- Mobile screens: replace `TrainingTemplatesScreen` placeholder with a real list; add `TrainingTemplateDetailScreen`, `TrainingTemplateFormScreen` (create/edit), and an `ExercisePicker` bottom sheet/screen.
- Days: add day, remove day, reorder via up/down buttons (no drag-and-drop).
- Each exercise row in the form: pick exercise from picker, then set sets / repsMin / repsMax / restSeconds.
- Detox E2E for owner and trainer golden paths + one error/edge case.

**Out of scope:**
- Assigning templates to members (separate feature — `MemberPlan` already exists, not touched here).
- Web changes of any kind.
- Drag-and-drop exercise/day reordering.
- Editing or deleting global exercises.
- Exercise images / equipment / bodyParts editing in the picker (model keeps existing defaults; mobile create form sends only name, muscleGroup, isBodyweight).
- Superset *creation* UI gestures — exercises persist `groupId`/`isSuperset` (defaulting each exercise to its own non-superset group); detail screen *displays* grouping but the form does not build multi-exercise supersets in this phase.

## Affected Files

### Stage 1 — `backend/`
Created:
- `backend/src/common/models/plan-template.model.ts`
- `backend/src/common/models/exercise.model.ts`
- `backend/src/modules/plan-templates/plan-templates.module.ts`
- `backend/src/modules/plan-templates/plan-templates.controller.ts`
- `backend/src/modules/plan-templates/plan-templates.service.ts`
- `backend/src/modules/plan-templates/plan-templates.controller.spec.ts`
- `backend/src/modules/plan-templates/plan-templates.service.spec.ts`
- `backend/src/modules/plan-templates/dto/create-plan-template.dto.ts`
- `backend/src/modules/plan-templates/dto/update-plan-template.dto.ts`
- `backend/src/modules/plan-templates/dto/plan-day.dto.ts`
- `backend/src/modules/exercises/exercises.module.ts`
- `backend/src/modules/exercises/exercises.controller.ts`
- `backend/src/modules/exercises/exercises.service.ts`
- `backend/src/modules/exercises/exercises.controller.spec.ts`
- `backend/src/modules/exercises/exercises.service.spec.ts`
- `backend/src/modules/exercises/exercises.dev.controller.ts`
- `backend/src/modules/exercises/dto/create-exercise.dto.ts`
- `backend/test/plan-templates.e2e-spec.ts`
- `backend/test/exercises.e2e-spec.ts`
Modified:
- `backend/src/app.module.ts` (register `PlanTemplatesModule`, `ExercisesModule`)

### Stage 2 — `mobile/` data layer
Created:
- `mobile/src/types/training-templates.ts`
- `mobile/src/lib/api/training-templates.api.ts`
- `mobile/src/lib/api/exercises.api.ts`
- `mobile/src/stores/training-templates.store.ts`
- `mobile/src/stores/training-templates.store.spec.ts`
- `mobile/src/stores/exercises.store.ts`
- `mobile/src/stores/exercises.store.spec.ts`

### Stage 3 — `mobile/` screens + E2E
Created:
- `mobile/src/screens/training-templates/TrainingTemplatesScreen.tsx`
- `mobile/src/screens/training-templates/TrainingTemplatesScreen.spec.tsx`
- `mobile/src/screens/training-templates/TrainingTemplateDetailScreen.tsx`
- `mobile/src/screens/training-templates/TrainingTemplateDetailScreen.spec.tsx`
- `mobile/src/screens/training-templates/TrainingTemplateFormScreen.tsx`
- `mobile/src/screens/training-templates/TrainingTemplateFormScreen.spec.tsx`
- `mobile/src/screens/training-templates/ExercisePicker.tsx`
- `mobile/src/screens/training-templates/ExercisePicker.spec.tsx`
- `mobile/e2e/owner/training-templates.spec.ts`
- `mobile/e2e/trainer/training-templates.spec.ts`
Modified:
- `mobile/src/navigation/index.tsx` (register `TrainingTemplateDetail` + `TrainingTemplateForm` on `AppStack`, add to `AppStackParamList`, swap placeholder import for real `TrainingTemplatesScreen`)
- `mobile/src/screens/placeholders/index.ts` (remove `TrainingTemplatesScreen` placeholder export)

---

## Stage 1: Backend plan-templates + exercises modules

**Goal**: Two fully-tested NestJS modules exposing the six endpoints with role + ownership enforcement, backed by new `PlanTemplate` and `Exercise` models that mirror the `web/` schemas.

**Design notes for the Generator (not test criteria):**
- Models use `@nestjs/mongoose` `@Schema`/`@Prop` decorators (see `body-test.model.ts`), but field shapes must match `web/src/lib/db/models/plan-template.model.ts` and `exercise.model.ts` exactly so the shared DB stays consistent. Reuse the day/exercise sub-schema shape already present in `member-plan.model.ts`.
- `PATCH` replaces the entire `days` array (full replace, as specified) and may also change `name`/`description`.
- `GET /plan-templates` returns only docs where `createdBy === req.user.sub`.
- `GET /exercises?q=` returns docs where `isGlobal === true OR createdBy === req.user.sub`, name matched case-insensitively against `q`; empty/absent `q` returns all visible exercises.
- `POST /exercises` sets `isGlobal: false`, `createdBy: req.user.sub`.
- Ownership violations on `PATCH`/`DELETE` (template not owned by caller) → `NotFoundException` (404), matching the body-tests `remove` pattern.
- Dev controller (`exercises.dev.controller.ts`) registered only when `NODE_ENV !== 'production'`; exposes `POST /exercises/dev/seed-global` taking `{ name }` and upserting a global exercise — used by E2E so the picker has at least one result.

**Sprint Contract**:

*Unit tests (service + controller):*
- [ ] `PlanTemplatesService > findOwn > returns only templates where createdBy equals the requesting user id`
- [ ] `PlanTemplatesService > create > persists template with createdBy set to the requesting user and returns it with days intact`
- [ ] `PlanTemplatesService > update > full-replaces the days array and updates name/description`
- [ ] `PlanTemplatesService > update > throws NotFoundException when the template is not owned by the caller`
- [ ] `PlanTemplatesService > remove > throws NotFoundException when the template does not exist or is not owned by the caller`
- [ ] `ExercisesService > search > returns global exercises plus the caller's own, filtered case-insensitively by q`
- [ ] `ExercisesService > search > returns all visible exercises when q is empty`
- [ ] `ExercisesService > create > sets isGlobal false and createdBy to the caller and returns the created exercise`
- [ ] `PlanTemplatesController > create > delegates to service with req.user.sub and the dto`
- [ ] `ExercisesController > search > passes the q query param and req.user.sub to the service`

*Integration (one per endpoint, full request cycle, in `backend/test/`):*
- [ ] `POST /plan-templates` as owner with valid body → 201 and response includes the persisted template id, name, and days
- [ ] `GET /plan-templates` as trainer → 200 returns only templates created by that trainer (not another user's templates)
- [ ] `PATCH /plan-templates/:id` as the owning user with a new days array → 200 and the returned days match the new array exactly
- [ ] `DELETE /plan-templates/:id` for a template owned by another user → 404 (ownership enforced)
- [ ] `POST /plan-templates` with missing required `name` → 400 (validation pipe)
- [ ] `GET /plan-templates` with no auth token → 401
- [ ] `GET /plan-templates` as a member role → 403 (RolesGuard)
- [ ] `GET /exercises?q=bench` as owner → 200 returns matching global + own exercises, excludes another user's private exercises
- [ ] `POST /exercises` as trainer with `{ name, muscleGroup, isBodyweight }` → 201, response has `isGlobal: false` and `createdBy` equal to the trainer

**TDD sequence**:
1. Write failing service + controller unit specs → Red
2. Implement models, services, controllers, DTOs, modules; register in `app.module.ts` → Green
3. Write integration specs in `backend/test/`, run against `mongodb-memory-server` → pass
4. `/simplify`, then `cd backend && pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

**Status**: Not Started

---

## Stage 2: Mobile data layer (types, API, stores)

**Goal**: Typed API functions and two Zustand stores that talk to the Stage 1 endpoints, fully unit-tested with the API layer mocked.

**Design notes for the Generator (not test criteria):**
- Follow `lib/api/equipment.api.ts` + `stores/equipment.store.ts` patterns exactly (axios `apiClient`, async store actions with `loading`/`error`).
- `types/training-templates.ts`: `Exercise`, `PlanDayExercise`, `PlanDay`, `PlanTemplate`, `CreatePlanTemplateDto`, `UpdatePlanTemplateDto`, `CreateExerciseDto`. No `any`/`unknown`. Mirror the field names from the backend models (`groupId`, `isSuperset`, `exerciseId`, `exerciseName`, `sets`, `repsMin`, `repsMax`, `restSeconds`).
- `training-templates.api.ts`: `fetchTemplates()`, `createTemplate(dto)`, `updateTemplate(id, dto)`, `deleteTemplate(id)`.
- `exercises.api.ts`: `searchExercises(q)`, `createExercise(dto)`.
- `training-templates.store.ts`: state `{ items, loading, error }`, actions `fetchTemplates`, `addItem`, `updateItem`, `removeItem`.
- `exercises.store.ts`: state `{ results, loading, error }`, actions `search(q)` (debounce belongs in the screen, not the store), `addResult`.

**Sprint Contract**:

*Unit tests (one per store action / api fn):*
- [ ] `trainingTemplatesStore > fetchTemplates > populates items and clears loading on success`
- [ ] `trainingTemplatesStore > fetchTemplates > sets error and clears loading when the api rejects`
- [ ] `trainingTemplatesStore > updateItem > replaces the matching template by id in items`
- [ ] `trainingTemplatesStore > removeItem > drops the template with the given id from items`
- [ ] `exercisesStore > search > stores returned results and clears loading on success`
- [ ] `exercisesStore > search > sets error and clears loading when the api rejects`
- [ ] `training-templates.api > updateTemplate > calls PATCH /plan-templates/:id with the dto and returns response data`
- [ ] `exercises.api > searchExercises > calls GET /exercises with the q query param and returns response data`

*Integration / E2E:*
- [ ] (covered by Stage 3 — this stage has no UI; the two `api` unit tests above assert the exact request shape against a mocked `apiClient`, which is the integration boundary for the data layer)
- [ ] `training-templates.api > createTemplate > calls POST /plan-templates with the dto and returns the created template` (asserts request method + path + body)

**TDD sequence**:
1. Write failing store + api specs with `apiClient` / api module mocked → Red
2. Implement types, api functions, stores → Green
3. `/simplify`, then `cd mobile && pnpm lint && pnpm test`

**Status**: Not Started

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: Replace the placeholder with a working list screen; add detail, create/edit form, and exercise picker; wire navigation; cover owner and trainer flows with Detox.

**Design notes for the Generator (not test criteria):**
- Follow design.md mobile section: dark theme tokens, `ScreenHeader`, `text-foreground/65` for secondary text, `flex-row items-center justify-between` dense rows, `keyboardType="decimal-pad"` for numeric inputs, React Native Reusables `Dialog` for delete confirmation (no `Alert.alert`), `useSafeAreaInsets()` for sticky bottom bar, `accessibilityLabel` on every touchable.
- `TrainingTemplatesScreen`: list cards showing name, description, day count, exercise count; `+ Create Template` opens `TrainingTemplateForm`; tap a card pushes `TrainingTemplateDetail`. Skeleton rows while loading. testIDs: `screen-TrainingTemplates`, `templates-add-button`, `template-card-<id>`.
- `TrainingTemplateDetailScreen`: header with name + edit button; days listed each with name and exercise rows (name, `sets × repsMin–repsMax`, rest); delete button opens confirm dialog. testIDs: `screen-TrainingTemplateDetail`, `template-edit-button`, `template-delete-button`.
- `TrainingTemplateFormScreen`: name (required) + description (optional); add/remove day; up/down reorder; per-day add exercise via `ExercisePicker`; per-exercise sets/repsMin/repsMax/rest inputs; sticky save bar, save disabled until dirty + valid (name present, every exercise has sets/reps). On save → create or update via store → pop back. testIDs: `screen-TrainingTemplateForm`, `template-name-input`, `add-day-button`, `add-exercise-button-<dayIndex>`, `template-save-button`.
- `ExercisePicker`: search field (300ms debounce) calling `exercisesStore.search`; result rows; selecting one returns it to the form; a `Create custom exercise` affordance calling `createExercise`. testIDs: `exercise-picker`, `exercise-search-input`, `exercise-result-<id>`, `create-custom-exercise-button`.
- Navigation: add `TrainingTemplateDetail: { templateId }` and `TrainingTemplateForm: { templateId?: string }` to `AppStackParamList`; register on `AppStack`; replace placeholder import; remove placeholder export.
- E2E setup mirrors `e2e/owner/body-tests.spec.ts`: seed a fresh owner/trainer via `POST /auth/dev/seed-user-role`, and seed a global exercise via `POST /exercises/dev/seed-global` so the picker has a result. Run with `pnpm detox:build` then `pnpm detox:test`.

**Sprint Contract**:

*Unit tests (React Native Testing Library):*
- [ ] `TrainingTemplatesScreen > renders a card per template with its name, day count, and exercise count from the store`
- [ ] `TrainingTemplatesScreen > shows skeleton rows while loading is true and the empty state when items is empty and loading is false`
- [ ] `TrainingTemplateDetailScreen > renders each day with its exercises showing "sets × repsMin–repsMax" and opens the confirm dialog when delete is pressed`
- [ ] `TrainingTemplateFormScreen > save button is disabled until name is present and remains disabled while an added exercise is missing sets/reps`
- [ ] `ExercisePicker > calls exercisesStore.search with the typed query and renders a result row per returned exercise`

*E2E (Detox, against real simulator + backend):*
- [ ] `Owner: golden path` — log in as seeded owner → open Training Templates via drawer → tap `+ Create Template` → enter name → add a day → add an exercise from the picker → set sets/reps → save → new template card appears in the list → tap it → detail shows the day and exercise → tap delete → confirm → card is gone from the list
- [ ] `Owner: error/edge` — open create form, leave name empty → `template-save-button` is disabled (cannot save without a name)
- [ ] `Trainer: golden path` — log in as seeded trainer → Training Templates is reachable from the drawer → create a template with one day + one exercise → save → card appears → open detail → edit → change the template name → save → detail header shows the updated name

**TDD sequence**:
1. Write failing RNTL specs for each screen/component → Red
2. Implement screens, picker, navigation wiring; remove placeholder → Green
3. Write Detox specs (owner + trainer); `pnpm detox:build` then `pnpm detox:test` against running backend → pass
4. `/simplify`, then `cd mobile && pnpm lint && pnpm test`; then run the `design-reviewer` agent on `mobile/src/screens/training-templates/`

**Status**: Not Started
