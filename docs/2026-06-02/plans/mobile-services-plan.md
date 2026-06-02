# Mobile Services Implementation Plan

## Goal
A gym Owner can view, add, edit, and toggle active/inactive status of gym service types from the mobile app, backed by a new Owner-only `/service-types` API.

## Application
cross-app — `backend/` (new `service-types` module + model) and `mobile/` (types, API layer, Zustand store, `ServicesScreen` + `ServiceBottomSheet`, Detox spec). No `web/` changes.

## Design Spec
`.superpowers/specs/2026-06-02-mobile-services-design.md` — read before implementing any stage.

## Scope

**In scope:**
- Backend NestJS `service-types` module: `GET`, `POST`, `PATCH /service-types/:id`, Owner-only, stamps `createdBy` from JWT
- Backend Mongoose model on the shared `servicetypes` collection (mirrors web schema)
- Mobile types, API layer (`fetchServiceTypes`, `createServiceType`, `updateServiceType`), Zustand store
- Mobile `ServicesScreen` (list + filter tabs + empty states) replacing the placeholder
- Mobile `ServiceBottomSheet` (combined Add/Edit modal)
- Detox E2E golden path + one error case

**Out of scope:**
- Hard delete of service types (deactivation only, via `isActive` toggle in Edit mode)
- Currency selection (always `'AUD'`, not user-configurable)
- Any `web/` changes — web already owns this collection
- Billing screen, invoices, or anything beyond service-type CRUD
- Pagination / server-side filtering (filtering is client-side in the store)

## Affected Files

**Stage 1 — backend (create):**
- `backend/src/common/models/service-type.model.ts`
- `backend/src/modules/service-types/service-types.module.ts`
- `backend/src/modules/service-types/service-types.controller.ts`
- `backend/src/modules/service-types/service-types.service.ts`
- `backend/src/modules/service-types/dto/create-service-type.dto.ts`
- `backend/src/modules/service-types/dto/update-service-type.dto.ts`
- `backend/src/modules/service-types/service-types.service.spec.ts`
- `backend/src/modules/service-types/service-types.controller.spec.ts`
- `backend/test/service-types.e2e-spec.ts`

**Stage 1 — backend (modify):**
- `backend/src/app.module.ts` — register `ServiceTypesModule`

**Stage 2 — mobile (create):**
- `mobile/src/types/service-types.ts`
- `mobile/src/lib/api/service-types.api.ts`
- `mobile/src/stores/service-types.store.ts`
- `mobile/__tests__/lib/api/service-types.api.test.ts`
- `mobile/__tests__/stores/service-types.store.test.ts`

**Stage 3 — mobile (create):**
- `mobile/src/screens/services/ServicesScreen.tsx`
- `mobile/src/screens/services/ServiceBottomSheet.tsx`
- `mobile/__tests__/screens/services/ServicesScreen.test.tsx`
- `mobile/__tests__/screens/services/ServiceBottomSheet.test.tsx`

**Stage 3 — mobile (modify):**
- `mobile/src/screens/placeholders/index.ts` — remove `ServicesScreen` export
- `mobile/src/navigation/index.tsx` — import `ServicesScreen` from `../screens/services/ServicesScreen` instead of placeholders

**Stage 4 — mobile (create):**
- `mobile/e2e/owner/services.spec.ts`

---

## Stage 1: Backend — service-types module

**Goal**: A working Owner-only `/service-types` API with `GET` (list, sorted by name asc), `POST` (create, stamps `createdBy` from `req.user.sub`), and `PATCH /:id` (update), backed by a Mongoose model on the `servicetypes` collection.

**Implementation notes (read the referenced files — do not invent patterns):**
- Model: `@Schema({ collection: 'servicetypes', timestamps: { createdAt: true, updatedAt: false } })`. Fields per spec: `name` (String, required, trim), `durationMin` (Number, required, min 1), `pricePerSession` (Number, required, min 0), `currency` (String, required, default `'AUD'`), `note` (String, default null, trim), `isActive` (Boolean, required, default true), `createdBy` (ObjectId, required). Add index `{ isActive: 1 }`. Mirror `backend/src/common/models/equipment.model.ts`.
- Controller: copy guard/decorator pattern from `equipment.controller.ts` — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`. `POST` uses `@HttpCode(HttpStatus.CREATED)`. Read the JWT user via `@Request() req: RequestWithUser` with `req.user.sub` (see `gym.controller.ts` and `JwtUser` in `backend/src/modules/auth/strategies/jwt.strategy.ts`). Pass `req.user.sub` into `service.create(dto, userId)`.
- Service: `findAll()` returns `find({}).sort({ name: 1 })`; `create(dto, userId)` trims name/note, sets `currency: 'AUD'`, `createdBy: new Types.ObjectId(userId)`, lets defaults (`isActive`) apply; `update(id, dto)` uses `findByIdAndUpdate(id, { $set: dto }, { new: true })` and throws `NotFoundException('Service type not found')` on null. Mirror `equipment.service.ts`.
- DTOs: use `class-validator` like `create-equipment.dto.ts`. Create DTO: `name` (`@IsString @IsNotEmpty`), `durationMin` (`@IsNumber @Min(1)`), `pricePerSession` (`@IsNumber @Min(0)`), `note?` (`@IsOptional @IsString`). Update DTO: all optional, plus `isActive?` (`@IsOptional @IsBoolean`). `currency` and `createdBy` are NOT accepted from the client.
- Register `ServiceTypesModule` in `app.module.ts` and add `ServiceTypesModule` to the e2e `buildApp` imports (mirror `equipment.e2e-spec.ts`).

**Sprint Contract**:

*Unit tests (`service-types.service.spec.ts` + `service-types.controller.spec.ts`):*
- [ ] `ServiceTypesService > findAll > calls find({}) then sort({ name: 1 }) and returns the result`
- [ ] `ServiceTypesService > create > persists with currency:"AUD", createdBy set from userId, and trimmed name when name has surrounding whitespace`
- [ ] `ServiceTypesService > create > applies isActive default true (does not set isActive in the create payload)`
- [ ] `ServiceTypesService > update > calls findByIdAndUpdate(id, { $set: dto }, { new: true }) and returns updated document`
- [ ] `ServiceTypesService > update > throws NotFoundException when findByIdAndUpdate resolves null`
- [ ] `ServiceTypesController > create > passes req.user.sub as the userId argument to service.create`

*Integration / E2E (`backend/test/service-types.e2e-spec.ts`, full request cycle):*
- [ ] `POST /service-types` owner with `{name:"PT Session", durationMin:60, pricePerSession:80}` → 201 with `_id`, `currency:"AUD"`, `isActive:true`, `createdBy` present
- [ ] `POST /service-types` owner with `{name:"", durationMin:60, pricePerSession:80}` → 400
- [ ] `POST /service-types` owner with `{name:"X", durationMin:0, pricePerSession:80}` → 400 (durationMin below min)
- [ ] `GET /service-types` owner → 200 array sorted by name ascending and including a previously created item
- [ ] `GET /service-types` no token → 401
- [ ] `GET /service-types` member token → 403
- [ ] `PATCH /service-types/:id` owner with `{isActive:false}` → 200 with `isActive:false`
- [ ] `PATCH /service-types/:id` owner with unknown id → 404

**TDD sequence**:
1. Write failing service + controller unit tests → Red
2. Implement model, DTOs, service, controller, module; register in `app.module.ts` → Green
3. Write `service-types.e2e-spec.ts` (mirror equipment e2e auth setup) → passes against MongoMemoryServer

**Verification commands**:
- `cd backend && pnpm test -- --testPathPattern=service-types`
- `cd backend && pnpm test:e2e -- --testPathPattern=service-types`
- `cd backend && pnpm lint && pnpm build`

**Status**: Complete

### Stage 1 Checkpoint
- [x] `service-types.service.spec.ts` + `service-types.controller.spec.ts` — unit tests
- [x] Model, DTOs, service, controller, module implemented
- [x] `service-types.e2e-spec.ts` — integration tests

---

## Stage 2: Mobile — types, API layer, store

**Goal**: Mobile has typed access to the API and a Zustand store holding all service types with a client-side filter, ready for the screen to consume.

**Implementation notes:**
- Types per spec section "Types": `FilterTab = 'all' | 'active' | 'inactive'`, `ServiceType`, `CreateServiceTypeDto`, `UpdateServiceTypeDto`. No `any`/`unknown`.
- API layer mirrors `mobile/src/lib/api/equipment.api.ts` using `apiClient`: `fetchServiceTypes()` → `GET /service-types`; `createServiceType(dto)` → `POST /service-types`; `updateServiceType(id, dto)` → `PATCH /service-types/:id`.
- Store mirrors `mobile/src/stores/equipment.store.ts`: state `{ items, filter, loading, error }`, actions `fetchServiceTypes` (sets loading, calls api, sets items or error message), `addItem` (prepends), `updateItem` (replaces by `_id`), `setFilter`.
- API tests mock `apiClient` (jest.mock the client module) and assert URL + payload + returned data.
- Store tests reset store state between cases and mock the api module.

**Sprint Contract**:

*Unit tests:*
- [ ] `service-types.api > fetchServiceTypes > GETs /service-types and returns response.data`
- [ ] `service-types.api > createServiceType > POSTs /service-types with the dto and returns the created ServiceType`
- [ ] `service-types.api > updateServiceType > PATCHes /service-types/:id with the dto and returns the updated ServiceType`
- [ ] `useServiceTypesStore > fetchServiceTypes > populates items and sets loading false on success`
- [ ] `useServiceTypesStore > fetchServiceTypes > sets error message and loading false when api rejects`
- [ ] `useServiceTypesStore > addItem > prepends the new item to items`
- [ ] `useServiceTypesStore > updateItem > replaces the item with matching _id and leaves others unchanged`
- [ ] `useServiceTypesStore > setFilter > updates filter to the given tab`

*Integration (store + api wired together, api mocked):*
- [ ] `useServiceTypesStore > fetchServiceTypes` calls `service-types.api.fetchServiceTypes` exactly once and stores its resolved array
- [ ] After `addItem` then `setFilter('inactive')`, store state reflects both the new item present in `items` and `filter === 'inactive'`

**TDD sequence**:
1. Write failing api + store unit tests → Red
2. Implement `types/service-types.ts`, `lib/api/service-types.api.ts`, `stores/service-types.store.ts` → Green
3. Run full mobile Jest suite to confirm no regressions

**Verification commands**:
- `cd mobile && pnpm test -- --testPathPattern=service-types`
- `cd mobile && pnpm test` (no regressions)
- `cd mobile && pnpm lint`

**Status**: Not Started

---

## Stage 3: Mobile — ServicesScreen + ServiceBottomSheet UI

**Goal**: A real `ServicesScreen` (replacing the placeholder) listing service cards with All/Active/Inactive filter tabs, a "+" header button that opens an Add sheet, and tapping a card opens an Edit sheet pre-filled — both backed by the store and API.

**Implementation notes:**
- Remove `ServicesScreen` from `mobile/src/screens/placeholders/index.ts` and import the real one in `navigation/index.tsx` (mirror how `EquipmentScreen` is imported). No new stack screen — both sheets render inside `ServicesScreen`.
- `ServicesScreen` mirrors `EquipmentScreen.tsx` structure: header (title "Services", subtitle "Manage gym services", "+" button), filter tab row (All · Active · Inactive — active tab styling per design), skeleton rows while loading, card list, empty states. Card per spec: name left; `Xmin · $Y AUD` right (use `currency`); "Active"/"Inactive" badge always shown (emerald for active, muted/`text-foreground/35` for inactive). Tap card → open Edit sheet pre-filled.
- `ServiceBottomSheet` is a single modal used for both modes (mirror `AddEquipmentSheet.tsx` modal shell). Props include an optional `service` (present = Edit mode). Title "Add Service" / "Edit Service". Fields in order: Name (text, required), Duration (`keyboardType="decimal-pad"`, required, "min" suffix), Price per session (`decimal-pad`, required, "AUD" suffix), Note (text, optional), Active (Switch, Edit mode only). Save enabled: Add → name+duration+price non-empty; Edit → dirty (JSON snapshot) AND required fields non-empty. On save: POST/PATCH → `addItem`/`updateItem` → dismiss → success feedback ("Service added"/"Changes saved"); on error → error feedback. Dismiss resets form state.
- Follow `.claude/instructions/design.md` mobile section: color tokens only (no hardcoded hex except the existing `COLORS` ActivityIndicator pattern), `accessibilityLabel`/`accessibilityRole` on touchables, `useSafeAreaInsets()` for bottom padding, never `keyboardType="numeric"` for decimals.
- Provide stable `testID`s for Detox: `screen-Services`, `services-add-button`, `services-filter-all`, `services-filter-active`, `services-filter-inactive`, `service-card-<_id>`, `service-name-input`, `service-duration-input`, `service-price-input`, `service-note-input`, `service-active-toggle`, `service-save-button`, `service-sheet-cancel`.

**Sprint Contract**:

*Unit tests (`ServicesScreen.test.tsx` + `ServiceBottomSheet.test.tsx`):*
- [ ] `ServicesScreen > renders the three filter tabs All / Active / Inactive`
- [ ] `ServicesScreen > shows "No services added yet." when store items is empty and not loading`
- [ ] `ServicesScreen > shows "No services match this filter." when items exist but none match the active filter`
- [ ] `ServicesScreen > renders a card per service with name and "<dur>min · $<price> AUD" metadata and an Active/Inactive badge`
- [ ] `ServiceBottomSheet (Add mode) > save button is disabled when Name is empty`
- [ ] `ServiceBottomSheet (Add mode) > save button is enabled when Name, Duration, and Price are all non-empty`
- [ ] `ServiceBottomSheet (Edit mode) > renders pre-filled with the passed service values and shows the Active toggle`
- [ ] `ServiceBottomSheet (Edit mode) > save button is disabled until a field changes (dirty detection)`

*Integration / E2E (component-level interaction, api mocked):*
- [ ] Tapping the "+" header button on `ServicesScreen` makes the Add sheet (title "Add Service") visible
- [ ] In Add mode, filling Name/Duration/Price and pressing Save calls `createServiceType` and then the store `addItem`, and the sheet dismisses

**TDD sequence**:
1. Write failing `ServicesScreen` + `ServiceBottomSheet` render/interaction tests → Red
2. Implement both components; swap placeholder → real screen in navigation → Green
3. Run `/simplify`, then full mobile Jest suite (no regressions)
4. Run `design-reviewer` on the two new components after Evaluator PASS

**Verification commands**:
- `cd mobile && pnpm test -- --testPathPattern=services`
- `cd mobile && pnpm test` (no regressions)
- `cd mobile && pnpm lint`

**Status**: Not Started

---

## Stage 4: Mobile — Detox E2E spec

**Goal**: A Detox spec proves the full Owner service-types flow works against a real simulator, plus one error case.

**Implementation notes:**
- Spec at `mobile/e2e/owner/services.spec.ts`. Authenticate as an Owner and navigate to the Services screen via the drawer (mirror existing equipment/owner Detox specs for login + drawer navigation helpers).
- Use the `testID`s defined in Stage 3.

**Sprint Contract**:

*E2E (Detox, real simulator):*
- [ ] Golden path: open Services → tap `services-add-button` → fill Name, Duration, Price → tap `service-save-button` → the new service card appears in the list → tap the card → change Name → Save → success feedback shown → toggle `service-active-toggle` off → Save → switch to the Inactive filter tab → the card appears under Inactive
- [ ] Error case: open the Add sheet, leave Name empty → `service-save-button` is disabled (tapping it does not create a service / sheet stays open)

**TDD sequence**:
1. Write the Detox spec → Red (or build first if native build is stale)
2. `cd mobile && pnpm detox build --configuration <config>`
3. `cd mobile && pnpm detox test --configuration <config> --testPathPattern=services` → green

**Verification commands**:
- `cd mobile && pnpm detox build --configuration <config>`
- `cd mobile && pnpm detox test --configuration <config> --testPathPattern=services`

**Status**: Not Started
