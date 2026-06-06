# Foods Library (Mobile) Implementation Plan

## Goal
Owner and Trainer can manage the shared food database from the mobile app — search, create, edit, and delete food items that underlie nutrition templates and daily logging.

## Application
cross-app: `backend/` (PATCH + DELETE endpoints) and `mobile/` (data layer, screens, navigation, E2E)

## Scope

**In scope:**
- `backend/`: `PATCH /foods/:id` and `DELETE /foods/:id`, scoped so a user may only modify a food they created (never a global food, never another user's food).
- `mobile/`: extend the existing foods data layer (`foods.api.ts`, `foods.store.ts`, `Food` type + new `UpdateFoodDto`) with `update` and `delete`.
- `mobile/`: new `FoodsScreen` (drawer item `Foods` for Owner + Trainer) — debounced search, food list with macros, delete-with-confirm, header `+` to create, tap-to-edit.
- `mobile/`: new full-page stack screen `FoodForm` (create + edit modes) — sticky bottom Save (disabled until dirty + valid), unsaved-changes guard, name/brand/macros/servings fields.
- `mobile/`: navigation wiring — `Foods` registered under Owner + Trainer `TEMPLATES` nav group; `FoodForm` added to `AppStackParamList`.
- E2E: Detox specs for Owner (CRUD golden path + empty state) and Trainer (CRUD golden path).

**Out of scope:**
- Any change to global-food seeding or the `isGlobal` flag semantics (PATCH/DELETE simply refuse global foods).
- The existing `FoodSearchSheet` / `LogFoodScreen` consumers of `useFoodsStore` — their current behaviour (`search`, `addResult`) must be preserved unchanged; only additive changes to the store are allowed.
- Member access (Foods remains owner/trainer only, matching existing `@Roles('owner','trainer')`).
- New macro fields, units other than per-100g, or image upload for foods.
- `web/` — no changes.

## Affected Files

**Stage 1 — backend/**
- Create: `backend/src/modules/foods/dto/update-food.dto.ts`
- Modify: `backend/src/modules/foods/foods.service.ts` (add `update`, `remove`)
- Modify: `backend/src/modules/foods/foods.service.spec.ts` (unit tests for `update`, `remove`)
- Modify: `backend/src/modules/foods/foods.controller.ts` (add `@Patch(':id')`, `@Delete(':id')`)
- Modify: `backend/src/modules/foods/foods.controller.spec.ts` (unit tests for new handlers)
- Modify: `backend/test/foods.e2e-spec.ts` (integration tests for PATCH + DELETE)

**Stage 2 — mobile/ data layer**
- Modify: `mobile/src/types/nutrition-templates.ts` (add `UpdateFoodDto`)
- Modify: `mobile/src/lib/api/foods.api.ts` (add `updateFood`, `deleteFood`)
- Modify: `mobile/src/lib/api/foods.api.spec.ts` (tests for new functions)
- Modify: `mobile/src/stores/foods.store.ts` (add `update`, `remove` actions; keep `search` + `addResult`)
- Modify: `mobile/src/stores/foods.store.spec.ts` (tests for `update`, `remove`)

**Stage 3 — mobile/ screens + navigation**
- Create: `mobile/src/screens/foods/FoodsScreen.tsx`
- Create: `mobile/src/screens/foods/FoodsScreen.spec.tsx`
- Create: `mobile/src/screens/foods/FoodFormScreen.tsx`
- Create: `mobile/src/screens/foods/FoodFormScreen.spec.tsx`
- Create: `mobile/src/screens/foods/components/FoodCard.tsx`
- Create: `mobile/src/screens/foods/components/FoodCard.spec.tsx`
- Modify: `mobile/src/navigation/nav-config.ts` (add `Foods` to owner + trainer `TEMPLATES` groups)
- Modify: `mobile/src/navigation/index.tsx` (register `Foods` in `SCREEN_REGISTRY`; add `FoodForm` to `AppStackParamList` + `AppStack`)

**Stage 4 — mobile/ E2E**
- Create: `mobile/e2e/owner/foods.spec.ts`
- Create: `mobile/e2e/trainer/foods.spec.ts`

---

## Stage 1: Backend — PATCH + DELETE endpoints

**Goal**: `PATCH /foods/:id` updates a food the caller created; `DELETE /foods/:id` deletes a food the caller created. Both refuse global foods and foods owned by other users.

**Implementation notes**:
- `UpdateFoodDto` mirrors `CreateFoodDto` but every top-level field is `@IsOptional()` (name, brand, `macrosPer100g`, servings). Reuse the existing `MacrosPer100gDto` and `ServingDto` from `create-food.dto.ts`.
- `FoodsService.update(id, dto, userId)`: load the food; if not found → `NotFoundException`; if `isGlobal === true` or `createdBy !== userId` → `ForbiddenException`; otherwise apply `$set` of provided fields and return the updated document (`{ new: true }`).
- `FoodsService.remove(id, userId)`: same ownership/global guard, then `findByIdAndDelete`. Return `void`.
- Controller: `@Patch(':id')` returns updated food (200); `@Delete(':id')` returns 204 (`@HttpCode(HttpStatus.NO_CONTENT)`). Both pass `req.user.sub` as `userId`. Class-level `@Roles('owner','trainer')` already applies.

**Sprint Contract**:

*Unit tests:*
- [x] `FoodsService > update > applies $set of provided fields and returns updated document with { new: true } when caller is the creator`
- [x] `FoodsService > update > throws NotFoundException when the food id does not exist`
- [x] `FoodsService > update > throws ForbiddenException when the food is global (isGlobal true)`
- [x] `FoodsService > update > throws ForbiddenException when createdBy does not match userId`
- [x] `FoodsService > remove > calls findByIdAndDelete when caller is the creator`
- [x] `FoodsService > remove > throws ForbiddenException when createdBy does not match userId`
- [x] `FoodsController > update > delegates to service with id, dto and req.user.sub`
- [x] `FoodsController > remove > delegates to service with id and req.user.sub`

*Integration (`backend/test/foods.e2e-spec.ts`):*
- [x] `PATCH /foods/:id` as owner on a food the owner created → 200, response reflects the changed field (e.g. updated `name`)
- [x] `PATCH /foods/:id` as owner on a global food → 403
- [x] `PATCH /foods/:id` as trainer on the owner's private food → 403
- [x] `PATCH /foods/:id` with no token → 401
- [x] `PATCH /foods/:id` as member token → 403
- [x] `DELETE /foods/:id` as owner on a food the owner created → 204, and a subsequent `GET /foods?q=<name>` no longer returns it
- [x] `DELETE /foods/:id` as owner on a global food → 403
- [x] `DELETE /foods/:id` with no token → 401

**TDD sequence**:
1. Write failing service unit tests (update + remove ownership/global/notfound cases) → Red
2. Implement `UpdateFoodDto`, `FoodsService.update`/`remove` → Green
3. Write failing controller unit tests → Red; add controller handlers → Green
4. Add integration tests to `foods.e2e-spec.ts` (seed a global food, an owner-private food); run against in-memory Mongo → pass
5. `/simplify`, then `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build`

**Dependencies**: none.

**Status**: Complete

---

## Stage 2: Mobile data layer — types, API client, store

**Goal**: The foods data layer supports update and delete in addition to the existing search/create, with no regression to existing consumers (`FoodSearchSheet`, `LogFoodScreen`).

**Implementation notes**:
- Add `UpdateFoodDto` to `mobile/src/types/nutrition-templates.ts`: `{ name?: string; brand?: string | null; macrosPer100g?: FoodMacros; servings?: FoodServing[] }`.
- `foods.api.ts`: add `updateFood(id, dto): Promise<Food>` → `apiClient.patch('/foods/${id}', dto)`; `deleteFood(id): Promise<void>` → `apiClient.delete('/foods/${id}')`. Keep `searchFoods`, `createFood`.
- `foods.store.ts`: add `update(id, dto)` (calls `updateFood`, replaces the matching item in `results` by `_id`) and `remove(id)` (calls `deleteFood`, filters it out of `results`). Both set/clear `loading` and `error` like `search`. Do not remove `search` or `addResult`.

**Sprint Contract**:

*Unit tests:*
- [x] `foodsApi > updateFood > PATCHes /foods/:id with the dto and returns response.data` (mock `apiClient.patch`)
- [x] `foodsApi > deleteFood > DELETEs /foods/:id` (mock `apiClient.delete`)
- [x] `useFoodsStore > update > replaces the matching food in results by _id and clears loading on success`
- [x] `useFoodsStore > update > sets error and clears loading when the api rejects`
- [x] `useFoodsStore > remove > filters the deleted food out of results on success`
- [x] `useFoodsStore > remove > sets error and clears loading when the api rejects`
- [x] `useFoodsStore > search > still populates results and clears loading` (regression — existing test must keep passing)

*Integration:*
- [ ] (covered at unit level for `mobile/` data layer; no Detox here — E2E lives in Stage 4)

**TDD sequence**:
1. Write failing api tests for `updateFood`/`deleteFood` → Red; implement → Green
2. Write failing store tests for `update`/`remove` (and confirm `search`/`addResult` tests still pass) → Red; implement → Green
3. `/simplify`, then `cd mobile && pnpm test --testPathPattern='foods' && pnpm lint`

**Dependencies**: Stage 1 (endpoints must exist for the contract to be meaningful, though unit tests mock `apiClient`).

**Status**: Complete

---

## Stage 3: Mobile screens + navigation

**Goal**: `Foods` appears in the drawer for Owner and Trainer; the screen lists searchable foods with macros, supports delete-with-confirm and navigation to a full-page create/edit form that saves real data.

**Implementation notes**:
- `FoodsScreen` (`testID="screen-Foods"`): header `Foods` + subtitle `Manage food database`, header `+` button (`testID="foods-add-button"`) → `navigation.navigate('FoodForm', {})`. Search input (`testID="foods-search-input"`) with 300ms debounce calling `useFoodsStore.search`, clear button when value present, spinner while `loading`. On mount call `search('')`. List of `FoodCard` (whole card `Pressable`, `testID="food-card-<_id>"`) → `navigation.navigate('FoodForm', { food })`. Each card has a delete button (`testID="food-delete-<_id>"`) opening a `Dialog` confirm (`testID="food-delete-confirm"`) → `store.remove`. Empty state text when `results` is empty and not loading. Skeleton rows while loading.
- `FoodCard`: `flex-row items-center justify-between` — name (+ brand in `text-foreground/65`) on left; macros per 100g on right (kcal / P / C / F) using semantic accent colors (emerald = protein, amber = carbs, pink = fat) per design.md. No `MacroPill` component exists yet on mobile — render inline tinted pills following the `MACRO_TONES` convention.
- `FoodFormScreen` (`testID="screen-FoodForm"`): route param `{ food?: Food }`. Create mode when `food` is undefined, edit mode otherwise. Fields: Name (required, `testID="food-name-input"`), Brand (optional, `testID="food-brand-input"`), kcal/protein/carbs/fat per 100g (required, `keyboardType="decimal-pad"`, testIDs `food-kcal-input` / `food-protein-input` / `food-carbs-input` / `food-fat-input`), optional servings list (label + grams, add/remove). Sticky bottom Save (`testID="food-save-button"`) disabled until dirty AND valid (name non-empty + four core macros parse to numbers). Dirty detection via `JSON.stringify` snapshot. Header back triggers unsaved-changes `Dialog` guard (`testID="food-discard-confirm"`) when dirty. On save: create → `store.addResult` (or re-`search`) then `navigation.goBack()`; edit → `store.update` then `navigation.goBack()`. Show inline error on API failure.
- `nav-config.ts`: add `{ key: 'Foods', label: 'Foods', screen: 'Foods' }` to the `TEMPLATES` group for `owner` and `trainer` only.
- `navigation/index.tsx`: import `FoodsScreen` + `FoodFormScreen`; add `Foods: FoodsScreen` to `SCREEN_REGISTRY`; add `FoodForm: { food?: Food }` to `AppStackParamList`; register `<AppStack.Screen name="FoodForm" component={FoodFormScreen} />`.

**Sprint Contract**:

*Unit tests:*
- [ ] `FoodsScreen > renders a FoodCard per item in store.results with its name visible`
- [ ] `FoodsScreen > typing in the search input calls store.search with the query after the 300ms debounce`
- [ ] `FoodsScreen > tapping the add button navigates to FoodForm with no food param`
- [ ] `FoodsScreen > tapping a food card navigates to FoodForm with that food as param`
- [ ] `FoodsScreen > confirming the delete dialog calls store.remove with the food _id`
- [ ] `FoodsScreen > shows the empty state text when results is empty and not loading`
- [ ] `FoodFormScreen > Save button is disabled when name is empty`
- [ ] `FoodFormScreen > create mode: filling name + four macros and pressing Save calls store.update? no — calls createFood path then goBack` (assert create action invoked + `navigation.goBack`)
- [ ] `FoodFormScreen > edit mode: pre-fills fields from the food param and Save calls store.update with the food _id`
- [ ] `FoodCard > renders name, brand, and kcal/protein/carbs/fat from macrosPer100g`

*E2E (deferred to Stage 4 — these are the Stage 4 contract):*
- [ ] covered in Stage 4

**TDD sequence**:
1. Write failing `FoodCard` test → Red; implement `FoodCard` → Green
2. Write failing `FoodsScreen` tests (render/search/navigate/delete/empty) → Red; implement screen → Green
3. Write failing `FoodFormScreen` tests (disabled/create/edit/dirty) → Red; implement form → Green
4. Wire `nav-config.ts` + `navigation/index.tsx`
5. `/simplify`, then `cd mobile && pnpm test --testPathPattern='foods' && pnpm lint`
6. `use the design-reviewer agent on mobile/src/screens/foods` — fix violations before marking complete

**Dependencies**: Stage 2.

**Status**: Not Started

---

## Stage 4: E2E — Detox specs (owner + trainer)

**Goal**: Detox proves the full Foods CRUD flow works on a real simulator for both Owner and Trainer, against the real backend.

**Implementation notes**:
- Follow the existing Detox pattern (`e2e/owner/equipment.spec.ts`, `e2e/trainer/nutrition-templates.spec.ts`): seed accounts via `POST /auth/dev/seed-user-role`, log in, open drawer, tap `drawer-item-Foods`. Use timestamped names to keep runs idempotent.
- Owner spec: golden path (add → appears in list → tap card → edit name → save → returns to list with new name → delete via confirm → no longer visible) plus empty-state assertion (search a guaranteed-no-match query → empty state text visible; or Save disabled with empty name as the error case).
- Trainer spec: golden path (add → edit → delete) under a trainer token, confirming the trainer sees `drawer-item-Foods` and can manage their own foods.

**Sprint Contract**:

*E2E (`e2e/owner/foods.spec.ts`):*
- [ ] Owner: open drawer → tap `drawer-item-Foods` → `foods-add-button` visible
- [ ] Owner golden path: tap `foods-add-button` → fill name + four macros → tap `food-save-button` → the new food name is visible in the Foods list
- [ ] Owner edit: tap the created food card → change name → `food-save-button` → returns to list showing the edited name
- [ ] Owner delete: tap `food-delete-<id>` → `food-delete-confirm` → the food name is no longer visible
- [ ] Owner empty/error case: with an empty name, `food-save-button` is disabled (no food created) — OR searching a no-match query shows the empty state text

*E2E (`e2e/trainer/foods.spec.ts`):*
- [ ] Trainer: open drawer → `drawer-item-Foods` visible and tappable
- [ ] Trainer golden path: add a food → edit its name → delete it, with each state change asserted visible/not-visible

**TDD sequence**:
1. Write owner spec; run `cd mobile && pnpm detox:build` then `pnpm detox:test --testPathPattern=owner/foods` against the running backend → pass
2. Write trainer spec; run `pnpm detox:test --testPathPattern=trainer/foods` → pass

**Dependencies**: Stages 1–3.

**Status**: Not Started

---

## Architectural Risks

1. **Existing foods data layer is shared.** `useFoodsStore` and `foods.api.ts` already power `FoodSearchSheet` and `LogFoodScreen`. Stage 2 must be strictly additive — keep `search` and `addResult` and their passing tests. A regression here breaks nutrition-template editing and daily food logging.
2. **Ownership/global scoping is the security boundary.** Foods have no gym field — scoping is by `createdBy` plus the `isGlobal` read-only rule. The service guard (`ForbiddenException` on global or non-owned foods) is the only thing preventing a trainer from editing global/seed foods; the integration tests for 403 cases are load-bearing, not optional.
3. **Full-page form vs. bottom sheet divergence.** The design spec mandates a stack `FoodFormScreen` with sticky save + unsaved-changes guard (unlike `ServiceBottomSheet`/`AddEquipmentSheet`). Follow the `NutritionTemplateFormScreen` full-page pattern, not the sheet pattern, for consistency with the spec.
4. **No mobile `MacroPill` component exists.** Stage 3 renders macros inline using the `MACRO_TONES` color convention from design.md; if a shared MacroPill is desired later it can be extracted, but is out of scope here.
