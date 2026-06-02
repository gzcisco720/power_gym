# Mobile Equipment Implementation Plan

## Goal
A gym Owner can view, filter, add, edit, and delete gym equipment on mobile — including images, condition tracking, and per-item condition reports — backed by a new NestJS equipment module.

## Application
cross-app: `backend/` (new equipment module) + `mobile/` (API layer, Zustand store, screens)

## Scope
**In scope:**
- New `backend/src/modules/equipment/` module: 7 Owner-only endpoints (list, create, update, delete equipment; list + create condition reports; upload-signature)
- New backend `ConditionReport` Mongoose model (NestJS `@Schema`), reusing the existing `equipments` and `conditionreports` collections shared with `web/`
- Reuse of the existing backend `Equipment` model at `backend/src/common/models/equipment.model.ts`
- Mobile API layer `mobile/src/lib/api/equipment.api.ts`
- Mobile Zustand store `mobile/src/stores/equipment.store.ts`
- Mobile `EquipmentScreen` (replaces placeholder): filter tabs + list + empty states
- Mobile `AddEquipmentSheet` bottom sheet: form with catalog autocomplete, condition toggle, image upload
- Mobile `EquipmentDetailScreen`: Details tab (edit/delete) + Condition Reports tab, registered as a new stack screen
- Image upload via Cloudinary signed URL (or `local` provider) — signature issued by backend, file uploaded directly from mobile
- Bundled autocomplete catalog (`gym_equipment.json`) in mobile

**Out of scope:**
- Trainer/Member access to equipment (Owner-only everywhere)
- Equipment on `web/` (already exists — not touched)
- Editing/deleting individual condition reports (create + list only)
- Image cropping/editing; camera capture (photo library only)
- Offline support / optimistic caching beyond the in-memory store
- Push notifications for overdue service dates

## Affected Files

### Stage 1 (`backend/`)
- `backend/src/common/models/condition-report.model.ts` — NEW (NestJS `@Schema`, collection `conditionreports`)
- `backend/src/modules/equipment/equipment.module.ts` — NEW
- `backend/src/modules/equipment/equipment.controller.ts` — NEW
- `backend/src/modules/equipment/equipment.service.ts` — NEW
- `backend/src/modules/equipment/dto/create-equipment.dto.ts` — NEW
- `backend/src/modules/equipment/dto/update-equipment.dto.ts` — NEW
- `backend/src/modules/equipment/dto/create-condition-report.dto.ts` — NEW
- `backend/src/modules/equipment/equipment.service.spec.ts` — NEW (unit)
- `backend/src/modules/equipment/equipment.controller.spec.ts` — NEW (unit)
- `backend/test/equipment.e2e-spec.ts` — NEW (integration)
- `backend/src/app.module.ts` — MODIFY (register `EquipmentModule`)

### Stage 2 (`backend/`)
- `backend/src/common/upload/upload-signature.ts` — NEW (Cloudinary/local signature builder)
- `backend/src/modules/equipment/equipment.controller.ts` — MODIFY (add `upload-signature` endpoint)
- `backend/src/modules/equipment/equipment.service.ts` — MODIFY (signature method)
- `backend/src/modules/equipment/equipment.service.spec.ts` — MODIFY (unit for signature)
- `backend/test/equipment.e2e-spec.ts` — MODIFY (integration for signature)

### Stage 3 (`mobile/`)
- `mobile/src/types/equipment.ts` — NEW (`EquipmentItem`, `ConditionReport`, `EquipmentStatus`, `FilterTab`, DTOs, `UploadConfig`)
- `mobile/src/lib/api/equipment.api.ts` — NEW
- `mobile/src/stores/equipment.store.ts` — NEW
- `mobile/src/lib/api/equipment.api.spec.ts` — NEW (unit)
- `mobile/src/stores/equipment.store.spec.ts` — NEW (unit)

### Stage 4 (`mobile/`)
- `mobile/assets/data/gym_equipment.json` — NEW (copied from `web/context/data/gym_equipment.json`)
- `mobile/src/lib/equipment-catalog.ts` — NEW (search helper over bundled catalog)
- `mobile/src/screens/equipment/EquipmentScreen.tsx` — NEW (replaces placeholder)
- `mobile/src/screens/equipment/AddEquipmentSheet.tsx` — NEW
- `mobile/src/screens/equipment/components/EquipmentCard.tsx` — NEW
- `mobile/src/screens/equipment/components/EquipmentImagePicker.tsx` — NEW (shared image-add row + upload)
- `mobile/src/lib/image-upload.ts` — NEW (selects via `expo-image-picker`, uploads to signed URL)
- `mobile/src/navigation/index.tsx` — MODIFY (wire real `EquipmentScreen` into `SCREEN_REGISTRY`)
- `mobile/src/screens/placeholders/index.ts` — MODIFY (remove `EquipmentScreen` placeholder export)
- `mobile/src/screens/equipment/EquipmentScreen.spec.tsx` — NEW (Jest)
- `mobile/src/screens/equipment/AddEquipmentSheet.spec.tsx` — NEW (Jest)
- `mobile/src/lib/equipment-catalog.spec.ts` — NEW (Jest)

### Stage 5 (`mobile/`)
- `mobile/src/screens/equipment/EquipmentDetailScreen.tsx` — NEW
- `mobile/src/screens/equipment/components/ConditionReportsTab.tsx` — NEW
- `mobile/src/screens/equipment/components/EquipmentDetailsTab.tsx` — NEW
- `mobile/src/navigation/index.tsx` — MODIFY (register `EquipmentDetail` stack screen + param type)
- `mobile/src/screens/equipment/EquipmentDetailScreen.spec.tsx` — NEW (Jest)
- `mobile/src/screens/equipment/components/ConditionReportsTab.spec.tsx` — NEW (Jest)
- `mobile/e2e/owner/equipment.spec.ts` — NEW (Detox E2E — full golden path)

---

## Stage 1: Backend Equipment Module — CRUD + Condition Reports

**Application**: `backend/`

**Goal**: A NestJS `EquipmentModule` exposing six Owner-only JSON endpoints over the shared `equipments` and `conditionreports` MongoDB collections, with a new `ConditionReport` NestJS model. (Upload-signature endpoint is Stage 2.)

**Context the Generator needs**:
- Reuse the existing model `backend/src/common/models/equipment.model.ts` (`Equipment` / `EquipmentSchema`) — do NOT create a second equipment model.
- Create a NEW `ConditionReport` NestJS `@Schema` mirroring `web/src/lib/db/models/condition-report.model.ts` (fields: `equipmentId: ObjectId ref Equipment`, `note: string`, `reportedAt: Date default now`; index `{ equipmentId: 1, reportedAt: -1 }`; `timestamps: false`). It must resolve to the same collection web uses (`conditionreports`) — set `@Schema({ collection: 'conditionreports' })`.
- Follow the controller/service/module pattern in `backend/src/modules/gym/`. Apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` on every handler. Owner id is `req.user.sub` (see `JwtUser`).
- Validation via `class-validator` DTOs (see `backend/src/modules/gym/dto/update-gym-info.dto.ts`). Global `ValidationPipe({ whitelist: true, transform: true })` is already applied in e2e and main.
- Endpoint behaviour mirrors the web routes under `web/src/app/api/owner/equipment/` (read those for create defaults, trimming, and report ordering).
- Integration test harness: copy the `buildApp` + `MongoMemoryServer` + seeded owner/member JWT pattern from `backend/test/gym.e2e-spec.ts`; add `EquipmentModule` and the two model `forFeature` registrations to the test module.

**Endpoints** (all `@Roles('owner')`):
| Method | Path | Behaviour |
|---|---|---|
| GET | `/equipment` | Returns all equipment, newest `createdAt` first |
| POST | `/equipment` | Creates equipment; `name` required (400 if blank); applies defaults (status `active`, quantity 1, trackCondition false); returns 201 with created item |
| PATCH | `/equipment/:id` | Partial update; 404 if id not found; returns updated item |
| DELETE | `/equipment/:id` | Deletes; also deletes its condition reports; returns 204 |
| GET | `/equipment/:id/condition-reports` | Returns reports for that equipment, newest `reportedAt` first; 404 if equipment missing |
| POST | `/equipment/:id/condition-reports` | Creates report; `note` required (400 if blank); 404 if equipment missing; returns 201 |

**Sprint Contract**:

*Unit tests:*
- [ ] `EquipmentService > findAll > returns all equipment sorted by createdAt descending`
- [ ] `EquipmentService > create > persists item with defaults (status active, quantity 1, trackCondition false) when only name provided`
- [ ] `EquipmentService > update > returns updated document and throws NotFoundException when id does not exist`
- [ ] `EquipmentService > remove > deletes the equipment and cascades delete of its condition reports`
- [ ] `EquipmentService > findConditionReports > returns reports sorted by reportedAt descending and throws NotFoundException when equipment is missing`
- [ ] `EquipmentService > createConditionReport > persists report with trimmed note and throws NotFoundException when equipment is missing`
- [ ] `EquipmentController > create > calls service.create with the DTO and returns its result`
- [ ] `EquipmentController > remove > calls service.remove with the route id`

*Integration (one per endpoint, full request cycle):*
- [ ] `POST /equipment` as owner with `{name:"Treadmill"}` → 201, body has `_id`, `status:"active"`, `quantity:1`, `trackCondition:false`
- [ ] `POST /equipment` as owner with `{name:""}` → 400
- [ ] `GET /equipment` as owner → 200 array including the created item; same request with no token → 401; as member → 403
- [ ] `PATCH /equipment/:id` as owner with `{status:"maintenance"}` → 200 with `status:"maintenance"`; unknown id → 404
- [ ] `DELETE /equipment/:id` as owner → 204, and a subsequent `GET /equipment` no longer contains it
- [ ] `POST /equipment/:id/condition-reports` as owner with `{note:"Belt worn"}` → 201; then `GET /equipment/:id/condition-reports` → 200 array newest-first containing it; POST with `{note:""}` → 400

**TDD sequence**:
1. Write failing service unit tests (mocked Mongoose models) → Red
2. Implement `ConditionReport` model, DTOs, service → Green
3. Write failing controller unit tests → Red; implement controller + module; register in `app.module.ts` → Green
4. Write integration e2e against `MongoMemoryServer` with real stack → passes

**Status**: Complete

### Stage 1 Checkpoint
- [x] ConditionReport model + DTOs
- [x] EquipmentService (unit tests)
- [x] EquipmentController (unit tests)
- [x] EquipmentModule + app.module.ts
- [x] Integration (e2e) tests

---

## Stage 2: Backend Image Upload Signature Endpoint

**Application**: `backend/`

**Goal**: `POST /equipment/upload-signature` returns a Cloudinary signed-upload config (or a local-upload config when `UPLOAD_PROVIDER=local`), matching the shape mobile expects, Owner-only.

**Context the Generator needs**:
- Port the logic from web's `getEquipmentImageSignatureAction` (`web/src/app/(dashboard)/owner/equipment/actions.ts`) and the `UploadConfig` union in `web/src/lib/storage/types.ts`.
- Return shape (no `error` field needed — use HTTP status):
  - cloudinary: `{ provider:'cloudinary', uploadUrl, apiKey, signature, timestamp, folder:'equipment', cloudName }`
  - local: `{ provider:'local', uploadUrl:'/equipment/upload', folder:'equipment' }`
- Signature: `sha1("folder=equipment&timestamp=<ts>" + CLOUDINARY_API_SECRET)`, `timestamp = round(Date.now()/1000)`.
- Read config via `ConfigService` / `process.env`. Put the pure signature builder in `backend/src/common/upload/upload-signature.ts` so it is unit-testable without env coupling (pass secret/cloudName/apiKey as args).
- Endpoint guarded `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`.
- For the `local` provider, do not implement a new multipart upload route in this stage — the existing `/gym/logo` multipart pattern + `fileUploadOptions` is the reference. Mobile will use Cloudinary in tests; the local path only needs to return the correct config object. (If a local upload route is required for the chosen env, add `POST /equipment/upload` using `FileInterceptor` + `fileUploadOptions` returning `{ url: "/uploads/<file>" }`.)

**Sprint Contract**:

*Unit tests:*
- [ ] `buildUploadSignature > with cloudinary args > returns sha1 of "folder=equipment&timestamp=<ts>"+secret and correct folder/cloudName/apiKey`
- [ ] `EquipmentService > getUploadSignature > returns local config when UPLOAD_PROVIDER is "local"`
- [ ] `EquipmentService > getUploadSignature > returns cloudinary config with provider "cloudinary" when UPLOAD_PROVIDER is unset`

*Integration:*
- [ ] `POST /equipment/upload-signature` as owner → 200 with body whose `provider` is `"cloudinary"` or `"local"` and `folder:"equipment"`
- [ ] `POST /equipment/upload-signature` with no token → 401; as member → 403

**TDD sequence**:
1. Write failing unit test for pure `buildUploadSignature` → Red; implement → Green
2. Write failing service unit tests for env branching → Red; implement → Green
3. Add controller endpoint; write failing integration test → Red; wire up → Green

**Status**: Complete

### Stage 2 Checkpoint
- [x] `backend/src/common/upload/upload-signature.ts` — pure `buildUploadSignature` helper
- [x] `EquipmentService.getUploadSignature` — env-branched local/cloudinary config (unit tests)
- [x] `EquipmentController` — `POST /equipment/upload-signature` endpoint
- [x] Integration tests — owner 200, no token 401, member 403

---

## Stage 3: Mobile API Layer + Zustand Store

**Application**: `mobile/`

**Goal**: `equipment.api.ts` wraps all seven backend endpoints via `apiClient`, and `useEquipmentStore` holds items + filter + loading/error with fetch/add/update/remove/setFilter actions.

**Context the Generator needs**:
- API pattern: `mobile/src/lib/api/owner-dashboard.api.ts` (thin `apiClient` wrappers). Auth header is injected by the client interceptor — do not add it manually.
- Store pattern + test pattern: `mobile/src/stores/owner-dashboard.store.ts` and `owner-dashboard.store.spec.ts` (mock the api module, `setState` reset in `beforeEach`).
- Types live in `mobile/src/types/equipment.ts` — define `EquipmentStatus`, `EquipmentItem`, `ConditionReport`, `FilterTab = 'all'|'active'|'maintenance'|'retired'`, `CreateEquipmentDto`, `UpdateEquipmentDto`, `UploadConfig` (mirror web union). No `any`/`unknown`.
- API functions: `fetchEquipment()`, `createEquipment(dto)`, `updateEquipment(id, dto)`, `deleteEquipment(id)`, `fetchConditionReports(equipmentId)`, `createConditionReport(equipmentId, note)`, `getUploadSignature()`.
- Store shape per design spec: `{ items, filter, loading, error, fetchEquipment, addItem, updateItem, removeItem, setFilter }`. `filter` default `'all'`.

**Sprint Contract**:

*Unit tests:*
- [ ] `equipmentApi > fetchEquipment > GETs /equipment and returns response.data`
- [ ] `equipmentApi > createEquipment > POSTs /equipment with the dto and returns created item`
- [ ] `equipmentApi > createConditionReport > POSTs /equipment/:id/condition-reports with { note } and returns the report`
- [ ] `useEquipmentStore > fetchEquipment > populates items and sets loading false on success`
- [ ] `useEquipmentStore > fetchEquipment > leaves items empty and sets error on failure`
- [ ] `useEquipmentStore > addItem > prepends the new item to items`
- [ ] `useEquipmentStore > updateItem > replaces the matching item by _id`
- [ ] `useEquipmentStore > removeItem > removes the item with the given _id`
- [ ] `useEquipmentStore > setFilter > updates filter value`

*Integration (mocked apiClient, real store↔api wiring):*
- [ ] `useEquipmentStore.fetchEquipment` with apiClient mocked to resolve a 2-item list → store `items.length === 2`
- [ ] `useEquipmentStore.fetchEquipment` with apiClient mocked to reject → store `error` is a non-empty string and `items` is `[]`

**TDD sequence**:
1. Write failing api unit tests (mock `apiClient`) → Red; implement api → Green
2. Write failing store unit tests (mock api module) → Red; implement store → Green

**Status**: Not Started

---

## Stage 4: Mobile Equipment List Screen + Add Sheet

**Application**: `mobile/`

**Goal**: The Owner sees a filterable list of equipment cards and can add a new item (with autocomplete name, condition fields, and image upload) via a bottom sheet; the new item appears in the list.

**Context the Generator needs**:
- Replace the placeholder: remove `EquipmentScreen` from `mobile/src/screens/placeholders/index.ts` and point `SCREEN_REGISTRY.Equipment` in `mobile/src/navigation/index.tsx` at the new screen. Keep `testID="screen-Equipment"` on the root via `<Screen testID="screen-Equipment">` so the existing `dashboard-navigation.spec.ts` Equipment assertion still passes.
- Use store from Stage 3 (`useEquipmentStore`) and api from Stage 3. Filtering is client-side off `items` + `filter`.
- Design tokens & patterns: `.claude/instructions/design.md` (mobile section) — screen header pattern, `text-foreground/65`, list density `px-3 py-2`, status badge colors (active=emerald, maintenance=amber, retired=foreground/35), skeleton loading, no `Alert.alert`, numeric input `keyboardType="numeric"` (quantity), Reusables `Button`/`Input`/`Dialog`/`Switch`, `accessibilityLabel` on touchables.
- Catalog: copy `web/context/data/gym_equipment.json` to `mobile/assets/data/gym_equipment.json`; `equipment-catalog.ts` exposes `searchCatalog(query, limit=8)` returning names where query (≥2 chars) is a case-insensitive substring.
- Image upload: `image-upload.ts` → `getUploadSignature()` then upload via `expo-image-picker` selection to the returned `uploadUrl`, returning the CDN/relative URL. Enforce max 5 images with a toast error. Tests mock `expo-image-picker` and the upload module.
- Overdue logic: `nextServiceDate < today` → amber "Overdue" badge + "Was due <date>" subtitle.
- Add `testID`s needed by the Detox spec (Stage 5): `equipment-add-button`, `equipment-card-<_id>` (or `equipment-card` for first), `equipment-filter-active`, `add-name-input`, `add-save-button`, name-suggestion items `catalog-suggestion-<name>`.

**Sprint Contract**:

*Unit tests (Jest + RNTL):*
- [ ] `searchCatalog > returns up to 8 case-insensitive substring matches and empty array for queries under 2 chars`
- [ ] `EquipmentScreen > renders one card per store item with name and status badge`
- [ ] `EquipmentScreen > filter "Active" tab > shows only active items`
- [ ] `EquipmentScreen > empty store > renders "No equipment added yet."`
- [ ] `EquipmentScreen > filter with no matches > renders "No equipment matches this filter."`
- [ ] `EquipmentCard > nextServiceDate in the past > renders an Overdue badge`
- [ ] `AddEquipmentSheet > Save button disabled until name is non-empty`
- [ ] `AddEquipmentSheet > typing >=2 chars > renders catalog suggestions and tapping one fills the name input`
- [ ] `AddEquipmentSheet > successful save > calls createEquipment, calls store.addItem, and shows "Equipment added" toast`

*E2E (Detox — folded into Stage 5 golden-path spec, but these criteria are owned here):*
- [ ] Owner on Equipment screen taps `equipment-add-button` → Add sheet appears with `add-name-input` visible
- [ ] Owner types a name, taps `add-save-button` → sheet dismisses and a new `equipment-card` with that name is visible in the list

**TDD sequence**:
1. Write failing `searchCatalog` unit test → Red; implement catalog helper → Green
2. Write failing `EquipmentCard` / `EquipmentScreen` render + filter tests (store seeded via `setState`) → Red; implement → Green
3. Write failing `AddEquipmentSheet` tests (mock api + image-upload) → Red; implement → Green
4. Wire screen into navigation; remove placeholder
5. E2E covered with Stage 5

**Status**: Not Started

---

## Stage 5: Mobile Equipment Detail Screen + Condition Reports + E2E

**Application**: `mobile/`

**Goal**: Tapping an equipment card opens a full-screen detail with a Details tab (edit/save/delete) and a Condition Reports tab (list + add report); a Detox spec proves the full add→edit→report→delete golden path on a simulator.

**Context the Generator needs**:
- Register `EquipmentDetail` as a new stack screen. The current `AppStack` (`mobile/src/navigation/index.tsx`) holds `Drawer` + `Settings`; add `EquipmentDetail: { equipment: EquipmentItem }` to `AppStackParamList` and an `<AppStack.Screen>`. Navigate from `EquipmentScreen` via `navigation.navigate('EquipmentDetail', { equipment })` (screen lives inside the Drawer, which is inside AppStack — confirm navigation ref reaches AppStack; if the card sits under the Drawer navigator, use the parent navigator). Header per design mobile screen-header pattern.
- Details tab: same fields as Add sheet, pre-filled; `isDirty` via JSON snapshot (design.md dirty-detection); Save → `updateEquipment` → `store.updateItem` → toast "Changes saved". Delete → Reusables `Dialog` (no `Alert.alert`) → `deleteEquipment` → `store.removeItem` → `navigation.goBack()` → toast "Equipment deleted".
- Condition Reports tab: always visible. If `trackCondition === false`, body shows "Enable condition tracking to use this feature." with no list/form. Otherwise: list newest-first (uses `fetchConditionReports`), empty state "No reports yet.", input + Submit → `createConditionReport` → prepend → clear → toast "Report added".
- Reuse `EquipmentImagePicker` from Stage 4 for the images section.
- `testID`s for Detox: `equipment-detail-name-input`, `equipment-detail-save`, `equipment-detail-delete`, `equipment-delete-confirm`, `tab-details`, `tab-condition-reports`, `report-note-input`, `report-submit`, `report-item-0`.
- Detox spec pattern: `mobile/e2e/owner/dashboard-navigation.spec.ts` (seed owner via `/auth/dev/seed-user-role`, login flow, `device.disableSynchronization()`). Backend must be running with seeded owner. Place spec at `mobile/e2e/owner/equipment.spec.ts`.

**Sprint Contract**:

*Unit tests (Jest + RNTL):*
- [ ] `EquipmentDetailScreen > pre-fills name/brand/quantity from the route equipment`
- [ ] `EquipmentDetailScreen > Save disabled until a field changes (isDirty)`
- [ ] `EquipmentDetailScreen > successful save > calls updateEquipment and store.updateItem and shows "Changes saved"`
- [ ] `EquipmentDetailScreen > Delete confirm > calls deleteEquipment, store.removeItem, navigation.goBack, shows "Equipment deleted"`
- [ ] `ConditionReportsTab > trackCondition false > renders "Enable condition tracking to use this feature." and no report input`
- [ ] `ConditionReportsTab > no reports > renders "No reports yet."`
- [ ] `ConditionReportsTab > submit note > calls createConditionReport and prepends the new report to the list`

*E2E (Detox — golden path + error case, real simulator + real backend):*
- [ ] Golden path: Owner logs in → opens Equipment → taps Add → enters name → saves → card appears → taps card → Detail opens → edits name → Save → "Changes saved" visible → opens Condition Reports tab → submits a note → report appears at top → taps Delete → confirms → returns to list and the item is gone
- [ ] Error case: in the Add sheet, leaving name empty keeps `add-save-button` disabled (no item created)

**TDD sequence**:
1. Write failing `EquipmentDetailScreen` unit tests (mock api, store, navigation) → Red; implement Details tab → Green
2. Write failing `ConditionReportsTab` unit tests → Red; implement → Green
3. Register stack screen + wire card navigation
4. Write the Detox golden-path + error spec → run against booted simulator + running backend → passes

**Status**: Not Started

---

## Architectural Risks / Notes
- **Shared collections**: backend `ConditionReport` `@Schema` MUST use `collection: 'conditionreports'` to match web's Mongoose default pluralization, or reports written by mobile will be invisible to web. The existing backend `Equipment` model already shares the `equipments` collection — verified.
- **Navigation depth**: `EquipmentScreen` lives under the Drawer (which is under AppStack). Pushing `EquipmentDetail` as an AppStack screen requires the navigation prop to reach the parent navigator (`navigation.getParent()` may be needed). Generator should verify the navigate call resolves at runtime via the Detox spec, not just Jest.
- **Upload provider**: if backend env has no Cloudinary credentials, `getUploadSignature` must still return a valid `local` config; the Detox golden path should avoid requiring a real image upload (add item with no image) so it is not blocked by upload infra.
- **Detox prerequisites**: spec requires a native build + running backend seeded with an owner — same setup as existing owner specs.
