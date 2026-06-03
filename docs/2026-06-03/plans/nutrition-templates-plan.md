# Nutrition Templates (Mobile, Phase 3) Implementation Plan

## Goal
Owner and Trainer can create, view, edit, and delete day-type-based nutrition templates (meals with food items and macros) from the mobile app, with food search backed by the global + own Food collection.

## Application
cross-app — `backend/` (new `nutrition-templates` + `foods` modules) and `mobile/` (data layer + screens). No `web/` changes; web models are the source of truth for the Mongoose schema and must stay in sync.

## Scope
**In scope:**
- Backend `nutrition-templates` module: list own, create, update (full dayTypes replace), delete own. Roles: owner, trainer.
- Backend `foods` module: searchable list (`?q&limit`), create custom food. Roles: owner, trainer.
- Mobile types, API layer, and Zustand store for nutrition templates + foods.
- Mobile `NutritionTemplatesScreen` (list, replaces placeholder).
- Mobile `NutritionTemplateDetailScreen` (new pushed stack screen) with day-type tabs, meals, items, delete.
- Mobile create/edit template flow (name, add/remove day types, add meals, add items via food search).
- Detox E2E for owner and trainer covering list → create → detail → edit → delete.

**Out of scope:**
- Assigning templates to members / "My Nutrition" member view (separate phase).
- Editing the full macro breakdown beyond kcal/protein/carbs/fat (extended fields like fiber/sodium are persisted if present on the food but not user-editable here).
- Food editing/deletion (only search + create-custom).
- Barcode scanning or external food databases.
- Description field UI on templates (model allows it; not surfaced this phase).
- Web app changes.

## Affected Files

### backend/ (Stage 1)
- `backend/src/modules/nutrition-templates/nutrition-template.model.ts` — new (mirror of web `nutrition-template.model.ts`; NestJS `@nestjs/mongoose` schema, same collection name `NutritionTemplate`)
- `backend/src/modules/nutrition-templates/dto/create-nutrition-template.dto.ts` — new
- `backend/src/modules/nutrition-templates/dto/update-nutrition-template.dto.ts` — new
- `backend/src/modules/nutrition-templates/dto/day-type.dto.ts` — new (nested DayType/Meal/MealItem validation)
- `backend/src/modules/nutrition-templates/nutrition-templates.service.ts` — new
- `backend/src/modules/nutrition-templates/nutrition-templates.service.spec.ts` — new
- `backend/src/modules/nutrition-templates/nutrition-templates.controller.ts` — new
- `backend/src/modules/nutrition-templates/nutrition-templates.controller.spec.ts` — new
- `backend/src/modules/nutrition-templates/nutrition-templates.module.ts` — new
- `backend/src/modules/foods/food.model.ts` — new (mirror of web `food.model.ts`, collection name `Food`)
- `backend/src/modules/foods/dto/create-food.dto.ts` — new
- `backend/src/modules/foods/dto/search-foods.dto.ts` — new (`q?: string`, `limit?: number`)
- `backend/src/modules/foods/foods.service.ts` — new
- `backend/src/modules/foods/foods.service.spec.ts` — new
- `backend/src/modules/foods/foods.controller.ts` — new
- `backend/src/modules/foods/foods.controller.spec.ts` — new
- `backend/src/modules/foods/foods.module.ts` — new
- `backend/src/app.module.ts` — modify (register both new modules)
- `backend/test/nutrition-templates.e2e-spec.ts` — new
- `backend/test/foods.e2e-spec.ts` — new

### mobile/ (Stage 2)
- `mobile/src/types/nutrition-templates.ts` — new (NutritionTemplate, DayType, Meal, MealItem, Food, Create/Update DTOs)
- `mobile/src/lib/api/nutrition-templates.api.ts` — new
- `mobile/src/lib/api/nutrition-templates.api.spec.ts` — new
- `mobile/src/lib/api/foods.api.ts` — new
- `mobile/src/lib/api/foods.api.spec.ts` — new
- `mobile/src/lib/nutrition-macros.ts` — new (per-day-type total kcal/protein helpers + per-quantity macro scaling)
- `mobile/src/lib/nutrition-macros.spec.ts` — new
- `mobile/src/stores/nutrition-templates.store.ts` — new
- `mobile/src/stores/nutrition-templates.store.spec.ts` — new
- `mobile/src/stores/foods.store.ts` — new
- `mobile/src/stores/foods.store.spec.ts` — new

### mobile/ (Stage 3)
- `mobile/src/screens/nutrition-templates/NutritionTemplatesScreen.tsx` — new (replaces placeholder)
- `mobile/src/screens/nutrition-templates/NutritionTemplateDetailScreen.tsx` — new
- `mobile/src/screens/nutrition-templates/NutritionTemplateFormScreen.tsx` — new (create + edit)
- `mobile/src/screens/nutrition-templates/components/FoodSearchSheet.tsx` — new
- `mobile/src/screens/nutrition-templates/components/DayTypeTabs.tsx` — new
- `mobile/src/screens/nutrition-templates/__tests__/NutritionTemplatesScreen.test.tsx` — new
- `mobile/src/screens/nutrition-templates/__tests__/NutritionTemplateDetailScreen.test.tsx` — new
- `mobile/src/screens/nutrition-templates/__tests__/NutritionTemplateFormScreen.test.tsx` — new
- `mobile/src/screens/placeholders/index.ts` — modify (remove `NutritionTemplatesScreen` export)
- `mobile/src/navigation/index.tsx` — modify (import real screen; register `NutritionTemplateDetail` + `NutritionTemplateForm` on `AppStack`; extend `AppStackParamList`)
- `mobile/e2e/owner/nutrition-templates.spec.ts` — new
- `mobile/e2e/trainer/nutrition-templates.spec.ts` — new

---

## Stage 1: Backend `nutrition-templates` + `foods` modules

**Goal**: Two NestJS modules exposing 6 endpoints, registered in `app.module.ts`, all scoped to the authenticated owner/trainer and reading/writing the shared `NutritionTemplate` and `Food` MongoDB collections. Schemas mirror the web models exactly so both apps interoperate.

Endpoints (4 functional units in nutrition-templates, 2 in foods = 6 total, within the 8 limit):
- `GET /nutrition-templates` → own templates (createdBy === req.user.sub), newest first.
- `POST /nutrition-templates` → create from `{ name, dayTypes }`.
- `PATCH /nutrition-templates/:id` → full replace of `name` + `dayTypes`; 404 if not found, 403/404 if not owned.
- `DELETE /nutrition-templates/:id` → delete own; 204; 404 if not found or not owned.
- `GET /foods?q=&limit=` → case-insensitive name match across own foods + global foods, capped at `limit` (default 20, max 50).
- `POST /foods` → create custom food owned by caller.

**Sprint Contract**:

*Unit tests (service + controller specs):*
- [ ] `NutritionTemplatesService > findOwn > returns only templates where createdBy matches userId, sorted createdAt desc`
- [ ] `NutritionTemplatesService > create > persists trimmed name and dayTypes with createdBy set to userId`
- [ ] `NutritionTemplatesService > update > replaces name and dayTypes and returns the updated doc when owned`
- [ ] `NutritionTemplatesService > update > throws NotFoundException when id does not exist or is not owned by userId`
- [ ] `NutritionTemplatesService > remove > throws NotFoundException when template is not owned by userId`
- [ ] `FoodsService > search > matches name case-insensitively across own + global foods and caps results at the limit`
- [ ] `FoodsService > search > returns newest-first when q is empty`
- [ ] `FoodsService > create > persists macrosPer100g and sets createdBy to userId`
- [ ] `NutritionTemplatesController > findOwn > delegates to service with req.user.sub`
- [ ] `FoodsController > create > delegates to service with dto and req.user.sub`

*Integration (`backend/test/*.e2e-spec.ts` — full request cycle):*
- [ ] `POST /nutrition-templates` as owner with valid body → 201 and response contains `_id`, `name`, and `dayTypes` with nested meals/items
- [ ] `GET /nutrition-templates` as owner → 200 array containing only the caller's templates (a second user's template is absent)
- [ ] `PATCH /nutrition-templates/:id` as the owning trainer → 200 with replaced dayTypes; `PATCH` on another user's template → 404
- [ ] `DELETE /nutrition-templates/:id` as owner → 204 and a subsequent `GET` no longer lists it
- [ ] `GET /nutrition-templates` with no auth token → 401; as `member` role → 403
- [ ] `POST /nutrition-templates` with missing `name` → 400 (validation pipe)
- [ ] `GET /foods?q=chick&limit=5` as trainer → 200 array of at most 5 foods whose name matches "chick", each with `kcal/protein/carbs/fat`
- [ ] `POST /foods` as owner with valid macros → 201; as `member` → 403

**TDD sequence**:
1. Write service + controller unit specs (Red).
2. Implement models, DTOs, services, controllers, modules; register in `app.module.ts` (Green).
3. Write e2e integration specs against the real Nest test app + Mongo (passes against real stack).

**Status**: Complete

### Stage 1 Checkpoint
- [x] NutritionTemplate model + Food model
- [x] DTOs (nutrition-templates + foods)
- [x] NutritionTemplatesService + unit spec
- [x] FoodsService + unit spec
- [x] NutritionTemplatesController + unit spec
- [x] FoodsController + unit spec
- [x] Modules + app.module.ts registration
- [x] nutrition-templates.e2e-spec.ts
- [x] foods.e2e-spec.ts

---

## Stage 2: Mobile data layer (types, API, store, macro helpers)

**Goal**: Typed API clients, two Zustand stores (templates + foods), and pure macro helper functions — no UI. Mirrors the existing `body-tests` / `service-types` mobile data-layer pattern (`apiClient` + `create()` store with `loading`/`error`).

Functional units: 2 API modules, 2 stores, 1 helper module = 5, within limit.

**Sprint Contract**:

*Unit tests (one per new function/method):*
- [ ] `nutrition-templates.api > fetchTemplates > GETs /nutrition-templates and returns response.data`
- [ ] `nutrition-templates.api > createTemplate > POSTs /nutrition-templates with the dto and returns the created template`
- [ ] `nutrition-templates.api > updateTemplate > PATCHes /nutrition-templates/:id with name and dayTypes`
- [ ] `nutrition-templates.api > deleteTemplate > DELETEs /nutrition-templates/:id`
- [ ] `foods.api > searchFoods > GETs /foods with q and limit query params and returns response.data`
- [ ] `foods.api > createFood > POSTs /foods with the dto`
- [ ] `nutritionMacros > dayTypeTotals > sums kcal and protein across all items in all meals of a day type`
- [ ] `nutritionMacros > scaleMacros > scales a food's per-100g macros to a given gram quantity (rounded)`
- [ ] `useNutritionTemplatesStore > fetchTemplates > populates templates and clears loading on success`
- [ ] `useNutritionTemplatesStore > fetchTemplates > sets error and clears loading on failure`
- [ ] `useNutritionTemplatesStore > removeTemplate > deletes via api and removes the template from state`
- [ ] `useFoodsStore > search > populates results and clears loading; debounced caller passes q through`

*Integration (store ↔ mocked api wiring, the data-layer equivalent of E2E):*
- [ ] `useNutritionTemplatesStore > createTemplate → calls api.createTemplate and prepends the returned template to state`
- [ ] `useNutritionTemplatesStore > updateTemplate → calls api.updateTemplate and replaces the matching template in state by _id`

**TDD sequence**:
1. Write api spec + store spec + macro-helper spec with mocked `apiClient` (Red).
2. Implement types, api modules, macro helpers, stores (Green).
3. Verify store↔api integration tests pass with the mocked client (real store logic exercised).

**Status**: In Progress

### Stage 2 Checkpoint
- [x] mobile/src/types/nutrition-templates.ts
- [x] mobile/src/lib/api/nutrition-templates.api.ts + spec
- [x] mobile/src/lib/api/foods.api.ts + spec
- [x] mobile/src/lib/nutrition-macros.ts + spec
- [x] mobile/src/stores/nutrition-templates.store.ts + spec
- [x] mobile/src/stores/foods.store.ts + spec

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: Replace the `NutritionTemplates` placeholder with a real list screen, add the pushed `NutritionTemplateDetail` screen and a `NutritionTemplateForm` create/edit screen with food search, wire navigation, and prove the full flow with Detox for both owner and trainer.

Functional units: list screen, detail screen, form screen, FoodSearchSheet, DayTypeTabs, nav wiring = within the 8-unit limit.

UI must follow `.claude/instructions/design.md` (mobile): dark theme tokens, `text-foreground/65` for secondary text, screen header pattern, sticky bottom action bar with `useSafeAreaInsets`, `keyboardType="decimal-pad"` for gram inputs, Reusables `<Dialog>` for delete confirmation (no `Alert.alert`), skeleton loading, `accessibilityLabel` on every touchable. design-reviewer must run after this stage.

**Sprint Contract**:

*Unit tests (React Native Testing Library):*
- [ ] `NutritionTemplatesScreen > renders one card per template showing name, day-type count, and per-day-type total kcal/protein`
- [ ] `NutritionTemplatesScreen > shows skeleton rows while loading and an empty state when there are no templates`
- [ ] `NutritionTemplatesScreen > tapping a card calls navigation.navigate('NutritionTemplateDetail', { templateId })`
- [ ] `NutritionTemplateDetailScreen > renders a tab per day type and switching tabs shows that day type's meals and items`
- [ ] `NutritionTemplateDetailScreen > tapping delete opens a confirm Dialog and confirming calls store.removeTemplate then navigates back`
- [ ] `NutritionTemplateFormScreen > add/remove day type updates the day-type list; cannot save with an empty template name`
- [ ] `NutritionTemplateFormScreen > selecting a food from FoodSearchSheet adds an item to the active meal with scaled macros for the entered grams`
- [ ] `FoodSearchSheet > typing in the search field calls foods store search (debounced) and renders matching results`

*E2E (Detox, real simulator — `mobile/e2e/owner/` and `mobile/e2e/trainer/`):*
- [ ] Owner golden path: open drawer → Nutrition Templates → tap "New" → enter name, add a day type, add a meal, search and add a food item → save → new template appears in the list with correct kcal/protein
- [ ] Owner detail + delete: tap a template → detail screen shows day-type tabs and meal items → tap Delete → confirm → template removed from list
- [ ] Owner edit: open a template → Edit → add a second day type and save → detail now shows two tabs
- [ ] Trainer golden path: trainer logs in, opens Nutrition Templates, creates a template, and sees only their own templates (an owner-created template is not listed)

**TDD sequence**:
1. Write RNTL screen/component tests against the Stage 2 stores (Red).
2. Implement screens + components; wire `navigation/index.tsx` (register screens on `AppStack`, extend `AppStackParamList`) and remove the placeholder export (Green).
3. Write/run Detox specs for owner + trainer against a real simulator build until they pass.
4. Run `/simplify`, then run the design-reviewer agent on the new screens and fix violations.

**Status**: Not Started

---

## Architectural Notes / Risks
- **Schema sync**: backend models must byte-for-byte match the web models' shapes and collection names (`NutritionTemplate`, `Food`) since both apps share one MongoDB. The Generator must copy field names exactly (`quantityG`, `macrosPer100g`, `kcal`, etc.), not invent new ones.
- **MealItem stores denormalized macros** (kcal/protein/carbs/fat are copied onto the item at the entered quantity), not a food reference. The form computes these via `scaleMacros` at selection time; foods are looked up only during search.
- **Trainer vs owner authorization is identical here** — both manage their own templates; there is no cross-user access. `createdBy === req.user.sub` is the only ownership rule.
- **PATCH is a full dayTypes replace**, matching the web edit flow — the Generator must not attempt partial/granular meal patching.
