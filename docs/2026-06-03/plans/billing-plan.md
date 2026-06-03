# Billing (Mobile) Implementation Plan

## Goal
Every role can open the Billing screen in the mobile app and see a read-only, month-navigable billing view: members see their own per-session billing lines with a total; owners and trainers see a per-member summary (session count + amount due) with a grand total.

## Application
cross-app: `backend/` (new billing module + endpoints) and `mobile/` (data layer + screens). No `web/` changes — web billing already exists and is the UX reference.

## Scope
**In scope:**
- New `backend/src/modules/billing/` module: service with two computed queries, controller with two JWT + role-guarded endpoints, unit tests, integration tests.
- Billing is **computed** from `ScheduledSession` documents (`status: 'scheduled'`, `serviceTypeId != null`, `date < now`) joined to `ServiceType` for price/currency. No new billing/invoice model.
- `GET /billing/summary?from=ISO&to=ISO` (Owner/Trainer) and `GET /billing/my?from=ISO&to=ISO` (Member).
- Mobile data layer: `types/billing.ts`, `lib/api/billing.api.ts`, `stores/billing.store.ts`.
- Mobile screens: role-aware `BillingScreen` rendering `OwnerTrainerBilling` or `MemberBilling`, shared `BillingPeriodNav` (prev/next month), member summary list + grand total, member billing lines list + total.
- Detox E2E for member billing and owner/trainer billing flows.

**Out of scope:**
- Any create / edit / delete of billing, sessions, or service types.
- Owner/Trainer drilling into a specific member's billing detail from this screen (that lives behind the future Members screen — Phase 3 of the broader roadmap; do NOT add a member-detail billing route here).
- Web app changes.
- Currency conversion / multi-currency aggregation logic beyond what the existing web `calculateMemberBilling` does (first line's currency wins, default `AUD`).
- Pagination, CSV export, payment status.

## Affected Files

**Backend (Stage 1 — create):**
- `backend/src/modules/billing/billing.module.ts`
- `backend/src/modules/billing/billing.service.ts`
- `backend/src/modules/billing/billing.service.spec.ts`
- `backend/src/modules/billing/billing.controller.ts`
- `backend/src/modules/billing/billing.controller.spec.ts`
- `backend/src/modules/billing/dto/billing-query.dto.ts`
- `backend/test/billing.e2e-spec.ts`

**Backend (Stage 1 — modify):**
- `backend/src/app.module.ts` (register `BillingModule`)

**Mobile data layer (Stage 2 — create):**
- `mobile/src/types/billing.ts`
- `mobile/src/lib/api/billing.api.ts`
- `mobile/src/lib/api/billing.api.spec.ts`
- `mobile/src/stores/billing.store.ts`
- `mobile/src/stores/billing.store.spec.ts`

**Mobile screens (Stage 3 — create):**
- `mobile/src/screens/billing/BillingScreen.tsx`
- `mobile/src/screens/billing/BillingScreen.spec.tsx`
- `mobile/src/screens/billing/OwnerTrainerBilling.tsx`
- `mobile/src/screens/billing/MemberBilling.tsx`
- `mobile/src/screens/billing/BillingPeriodNav.tsx`
- `mobile/src/screens/billing/BillingPeriodNav.spec.tsx`
- `mobile/e2e/member/billing.spec.ts`
- `mobile/e2e/owner/billing.spec.ts`

**Mobile screens (Stage 3 — modify):**
- `mobile/src/navigation/index.tsx` (import real `BillingScreen` from `../screens/billing/BillingScreen`, remove `BillingScreen` from the placeholders import)
- `mobile/src/screens/placeholders/index.ts` (remove the `BillingScreen` placeholder export)

## Reference data shapes (match web exactly)

Computation rule (from `web/src/lib/billing/calculate-billing.ts`): a session is billable when `status !== 'cancelled'`, `serviceTypeId != null`, and `date < now`. Each billable session contributes one line at `serviceType.pricePerSession`. `currency` = first line's currency, default `'AUD'`. `effectiveTo = min(to, now)`.

`ServiceType` fields (`backend/src/common/models/service-type.model.ts`): `name`, `pricePerSession: number`, `currency: string`. User display name = `firstName + ' ' + lastName`.

Summary response (`GET /billing/summary`):
```
{ members: Array<{ memberId, name, trainerName, sessionsCount, totalAmount, currency }>,
  grandTotal: number, currency: string }
```
Trainer role: scope query to `trainerId === req.user.sub`. Owner: all sessions.

My response (`GET /billing/my`):
```
{ memberId, from, to, total, count, currency,
  lines: Array<{ sessionId, date, startTime, endTime, serviceTypeName, price, currency }> }
```
Scope query to `memberIds` containing `req.user.sub`.

---

## Stage 1: Backend billing module

**Goal**: A `BillingModule` registered in `app.module.ts` exposing two computed, role-guarded endpoints over scheduled-session + service-type data, with `from`/`to` validated.

Wiring follows existing patterns: register `ScheduledSession`, `ServiceType`, and `User` schemas via `MongooseModule.forFeature` (see `dashboard.module.ts`); guards `JwtAuthGuard` + `RolesGuard` with `@Roles(...)` at controller method level (see `service-types.controller.ts`). Service-type lookup is a manual `$in` map (no `populate`), mirroring the web route. Reuse the `calculateMemberBilling` algorithm as a private helper inside the service (re-implement in NestJS — do not import from `web/`).

**Sprint Contract**:

*Unit tests (billing.service.spec.ts):*
- [ ] `BillingService > getMyBilling > returns one line per billable session with price from its service type and a total equal to the sum of line prices`
- [ ] `BillingService > getMyBilling > excludes cancelled sessions, sessions with null serviceTypeId, and sessions whose date is >= now`
- [ ] `BillingService > getMyBilling > returns total 0, count 0, empty lines, and currency 'AUD' when no billable sessions exist`
- [ ] `BillingService > getSummary > groups sessions by member returning sessionsCount and totalAmount per member plus a grandTotal equal to the sum of member totals`
- [ ] `BillingService > getSummary > when role is trainer, only includes sessions whose trainerId equals the requesting trainer id`

*Integration / E2E (backend has no E2E layer — these are integration tests in billing.e2e-spec.ts):*
- [ ] `GET /billing/summary` as a seeded owner with billable sessions → 200, body has `members`, `grandTotal`, `currency`; a member appears with correct `sessionsCount` and `totalAmount`.
- [ ] `GET /billing/summary` as a seeded member → 403; `GET /billing/my` as a seeded owner → 403; both endpoints with no/invalid JWT → 401.
- [ ] `GET /billing/my?from=...&to=...` as a seeded member with billable sessions → 200, body has `lines` (each with `serviceTypeName` and `price`), `total`, `count`, `currency`; invalid `from`/`to` (non-ISO) → 400.

**TDD sequence**:
1. Write `billing.service.spec.ts` with mocked models → Red.
2. Implement `BillingService` (private `calculateMemberBilling` helper + `getMyBilling` + `getSummary`) → Green.
3. Write `billing.controller.spec.ts` (verifies `@Roles` metadata + delegates to service) and `billing.e2e-spec.ts` against the real Nest test app with seeded Mongo data → Green.
4. Register `BillingModule` in `app.module.ts`; confirm `pnpm test` and `pnpm test:e2e` pass with no regressions.

**Status**: Complete

### Stage 1 Checkpoint
- [x] billing.service.spec.ts (unit tests)
- [x] BillingService implementation
- [x] billing.controller.spec.ts
- [x] BillingController implementation + DTO
- [x] billing.e2e-spec.ts
- [x] BillingModule + app.module.ts registration

---

## Stage 2: Mobile data layer

**Goal**: Typed API functions and a Zustand store that fetch both billing endpoints for a given period and expose loading/error/data state, with no UI.

Follow `health.api.ts` (axios via shared `apiClient`) and `health.store.ts` (Zustand `create`, `set({ loading, error })` pattern). The store holds the selected period (year + month, defaulting to the current month) and one fetch action per role; changing the period triggers a refetch. `apiClient` injects the JWT automatically — do not set headers manually.

**Sprint Contract**:

*Unit tests (billing.api.spec.ts + billing.store.spec.ts):*
- [ ] `billing.api > getMySummary > calls GET /billing/my with from and to ISO query params and returns the response body` (mocked `apiClient`)
- [ ] `billing.api > getBillingSummary > calls GET /billing/summary with from and to ISO query params and returns the response body` (mocked `apiClient`)
- [ ] `useBillingStore > fetchMy > sets myData on success and clears loading` (mocked api)
- [ ] `useBillingStore > fetchSummary > sets summaryData on success and clears loading` (mocked api)
- [ ] `useBillingStore > fetchMy > sets error string and clears loading when the api call rejects`
- [ ] `useBillingStore > setPeriod > a prev/next month change updates period state to the correct month boundaries (1st 00:00 → last day 23:59:59.999)`

*Integration / E2E:*
- [ ] (covered by Stage 3 Detox specs — no standalone integration layer for the mobile data layer)

**TDD sequence**:
1. Write `billing.api.spec.ts` mocking `apiClient` → Red. Implement `billing.api.ts` → Green.
2. Write `billing.store.spec.ts` mocking the api module → Red. Implement `billing.store.ts` → Green.
3. `/simplify`; confirm `cd mobile && pnpm test` and `pnpm lint` pass.

**Status**: In Progress

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: A role-aware `BillingScreen` wired into navigation that renders real billing data for the signed-in role, with working prev/next month navigation, verified end-to-end on a simulator.

`BillingScreen` reads `useAuthStore((s) => s.user?.role)` and renders `OwnerTrainerBilling` (owner/trainer) or `MemberBilling` (member). Both use the shared `BillingPeriodNav` (ported from `web/src/components/billing/billing-period-nav.tsx`, adapted to RN per `design.md`: `Pressable` with `accessibilityLabel`, NativeWind tokens, no hardcoded hex). Header uses the standard screen-header pattern. Loading state = skeleton rows. Empty state = "No completed sessions with a service type in this period." `MemberBilling` shows total at top and a list of `date · time · service name · price`; `OwnerTrainerBilling` shows the member summary list (`name`, `sessions count`, `amount`) and a grand total row. Remove the `Billing` placeholder and import the real screen in `navigation/index.tsx`.

Add stable `testID`s: `screen-Billing`, `billing-period-prev`, `billing-period-next`, `billing-period-label`, `billing-total`, `billing-line` (member rows), `billing-member-row` (summary rows), `billing-grand-total`, `billing-empty`.

**Sprint Contract**:

*Unit tests (BillingScreen.spec.tsx + BillingPeriodNav.spec.tsx):*
- [ ] `BillingScreen > renders MemberBilling (testID billing-line list) when auth store role is member` (mocked store + auth store)
- [ ] `BillingScreen > renders OwnerTrainerBilling (testID billing-member-row list + billing-grand-total) when auth store role is owner`
- [ ] `BillingScreen > shows the empty-state message (testID billing-empty) when the period has no billable sessions`
- [ ] `BillingPeriodNav > pressing Next advances the label to the next month and calls onChange with that month's from/to boundaries`

*Integration / E2E (Detox — run against a real simulator + running backend):*
- [ ] `mobile/e2e/member/billing.spec.ts`: seeded member logs in, opens drawer, taps "My Billing" → `screen-Billing` visible, `billing-total` visible, at least one `billing-line` visible (golden path); tapping `billing-period-prev` then `billing-period-next` returns `billing-period-label` to the original month (navigation works); a period with no sessions shows `billing-empty` (edge case).
- [ ] `mobile/e2e/owner/billing.spec.ts`: seeded owner logs in, opens drawer, taps "Billing" → `screen-Billing` visible, `billing-member-row` visible, `billing-grand-total` visible (golden path); navigating to a future/empty month shows `billing-empty` (edge case).

**TDD sequence**:
1. Write `BillingPeriodNav.spec.tsx` → Red; implement `BillingPeriodNav.tsx` → Green.
2. Write `BillingScreen.spec.tsx` (mock `useBillingStore` + `useAuthStore`) → Red; implement `BillingScreen`, `OwnerTrainerBilling`, `MemberBilling` → Green.
3. Wire navigation (remove placeholder, import real screen); confirm `nav-config.spec.ts` still passes.
4. `/simplify`; run `cd mobile && pnpm test` + `pnpm lint`.
5. Write Detox specs; `pnpm detox build` then `pnpm detox test` for member + owner billing → pass against the real stack.
6. Run the `design-reviewer` agent on `mobile/src/screens/billing/` and fix any violations.

**Status**: Not Started
