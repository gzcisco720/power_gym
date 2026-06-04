# My Nutrition Implementation Plan

## Goal
A member can open **My Nutrition**, see their assigned nutrition plan for today (resolved day type, meals, prescribed food items, target macros), log what they actually ate per meal, and watch today's macro totals update against target — while trainers/owners can assign a NutritionTemplate to a member and view that member's nutrition log history.

## Application
`mobile/` + `backend/` (cross-app). `web/` is read-only reference for Mongoose model shapes — **do not modify `web/`**.

## Scope

**In scope:**
- Backend `nutrition` module: member reads assigned plan + today's resolved day type; member logs food per meal into a `NutritionDailyLog`; today's macro summary; trainer/owner assign a `NutritionTemplate` to a member; trainer/owner read a member's daily-log history.
- Backend dev seed controller (`nutrition/dev/seed`) for Detox setup, mirroring `training.dev.controller.ts`.
- Backend `NutritionDailyLog` Mongoose model (new — does not yet exist in `backend/`); reuse of existing `backend/src/common/models/member-nutrition-plan.model.ts` and `backend/src/modules/nutrition-templates/nutrition-template.model.ts`.
- Mobile data layer: `nutrition.api.ts`, `nutrition.store.ts` (Zustand), `types/nutrition.ts`.
- Mobile screens: replace the `MyNutrition` placeholder with a real `MyNutritionScreen`; add a `LogFoodScreen` (food picker + quantity); wire both into navigation. Trainer/owner assign-template action surfaced from the existing member-detail flow.
- Detox E2E (member golden path): see nutrition plan → log a food entry → macro totals update.

**Out of scope:**
- Editing/deleting individual logged food items after they are added (add-only this sprint; correction is a future stage).
- Multi-day calendar navigation — only **today** is logged/viewed this sprint (date defaults to today server-side).
- `SelfNutritionLog` (the freestyle/ad-hoc self-log path that exists in `web/`) — out of scope; this feature uses the assigned-plan path (`NutritionDailyLog`) only.
- Per-meal completion toggles, "day complete" sealing, reminders/cron.
- Creating/authoring `NutritionTemplate`s (already shipped — Nutrition Templates feature).
- Any `web/` change.

## Affected Files

**Backend (create):**
- `backend/src/common/models/nutrition-daily-log.model.ts` — new NestJS Mongoose model (mirror `web/src/lib/db/models/nutrition-daily-log.model.ts`).
- `backend/src/modules/nutrition/nutrition.module.ts`
- `backend/src/modules/nutrition/nutrition.controller.ts`
- `backend/src/modules/nutrition/nutrition.controller.spec.ts`
- `backend/src/modules/nutrition/nutrition.service.ts`
- `backend/src/modules/nutrition/nutrition.service.spec.ts`
- `backend/src/modules/nutrition/nutrition.dev.controller.ts`
- `backend/src/modules/nutrition/dto/assign-nutrition-plan.dto.ts`
- `backend/src/modules/nutrition/dto/log-food.dto.ts`
- `backend/src/modules/nutrition/dto/seed-nutrition.dto.ts`
- `backend/test/nutrition.e2e-spec.ts`

**Backend (modify):**
- `backend/src/app.module.ts` — register `NutritionModule`.

**Mobile (create):**
- `mobile/src/types/nutrition.ts`
- `mobile/src/lib/api/nutrition.api.ts`
- `mobile/src/lib/api/nutrition.api.spec.ts`
- `mobile/src/stores/nutrition.store.ts`
- `mobile/src/stores/nutrition.store.spec.ts`
- `mobile/src/screens/my-nutrition/MyNutritionScreen.tsx`
- `mobile/src/screens/my-nutrition/MyNutritionScreen.spec.tsx`
- `mobile/src/screens/my-nutrition/LogFoodScreen.tsx`
- `mobile/src/screens/my-nutrition/LogFoodScreen.spec.tsx`
- `mobile/src/screens/my-nutrition/components/MealCard.tsx`
- `mobile/src/screens/my-nutrition/components/MacroSummary.tsx`
- `mobile/e2e/member/my-nutrition.spec.ts`

**Mobile (modify):**
- `mobile/src/navigation/index.tsx` — import real `MyNutritionScreen`; add `LogFood` stack route + `MyNutrition` param entry; remove `MyNutritionScreen` from the placeholder import block.
- `mobile/src/screens/placeholders/index.ts` — remove the `MyNutritionScreen` placeholder export (line ~36).
- `mobile/src/screens/members/MemberDetailScreen.tsx` — add an "Assign nutrition plan" action that opens the existing template picker and calls `assignNutritionPlan` (mirror how the training plan is assigned there).

---

## Shared Data Shapes (authoritative — used by both apps)

These mirror the existing `web/` Mongoose models. No `any`/`unknown` anywhere.

```typescript
// Macro fields carried on every logged/prescribed food item.
// Required core macros are always present; trace nutrients are optional.
interface MacroFields {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  transFat?: number;
}

interface MealItem extends MacroFields {
  foodName: string;
  quantityG: number;
}

interface Meal {
  name: string;
  order: number;
  items: MealItem[];
}

// A resolved day type from the assigned MemberNutritionPlan (the "prescription").
interface DayType {
  name: string;
  meals: Meal[];
}

// GET /nutrition/my-plan → null when no active plan assigned.
interface ActiveNutritionPlan {
  _id: string;
  name: string;
  templateId: string | null;
  assignedAt: string;          // ISO
  dayTypes: DayType[];
  todayDayTypeName: string;    // resolved from schedule for today; falls back to dayTypes[0].name
}

// One logged meal in NutritionDailyLog. `items` are what the member actually ate.
interface DailyLogMeal {
  name: string;
  order: number;
  items: MealItem[];
}

// GET /nutrition/today and the return of POST /nutrition/today/log.
interface NutritionDailyLog {
  _id: string;
  memberId: string;
  planId: string;
  date: string;                // YYYY-MM-DD
  dayTypeName: string;
  meals: DailyLogMeal[];
}

// Macro totals — computed server-side over all logged items.
interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// GET /nutrition/today/summary
interface MacroSummary {
  logged: MacroTotals;   // sum of NutritionDailyLog meal items
  target: MacroTotals;   // sum of the resolved day type's prescribed meal items
}

// POST /nutrition/today/log  body
interface LogFoodInput {
  mealName: string;      // which meal in the day the item belongs to
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// POST /nutrition/members/:memberId/assign-plan body (trainer/owner)
interface AssignNutritionPlanInput {
  templateId: string;
}
```

---

## Endpoint Contract

| Method | Path | Role | Returns |
|---|---|---|---|
| `GET` | `/nutrition/my-plan` | member | `ActiveNutritionPlan \| null` |
| `GET` | `/nutrition/today` | member | `NutritionDailyLog` (created empty-from-plan if none exists for today) |
| `POST` | `/nutrition/today/log` | member | updated `NutritionDailyLog` |
| `GET` | `/nutrition/today/summary` | member | `MacroSummary` |
| `POST` | `/nutrition/members/:memberId/assign-plan` | owner, trainer | `ActiveNutritionPlan` |
| `GET` | `/nutrition/members/:memberId/history` | owner, trainer | `NutritionDailyLog[]` (date desc) |
| `POST` | `/nutrition/dev/seed` | none (dev only) | `{ ok: true, planId }` |

Resolution rule for `todayDayTypeName` / `GET /nutrition/today`: look up `schedule.calendarOverrides` for today's date first, then `schedule.weeklyPattern` for today's `dayOfWeek`; if neither matches, use `dayTypes[0].name`. `GET /nutrition/today` lazily creates a `NutritionDailyLog` with that resolved `dayTypeName` and empty `meals` mirroring the prescribed meal names/orders (no items) so the UI has meal slots to log into.

---

## Stage 1: Backend `nutrition` module

**Goal**: Ship the `nutrition` NestJS module — model, service, controller, dev seed, DTOs, registered in `app.module.ts` — with unit + integration tests green, reusing the existing `MemberNutritionPlan` and `NutritionTemplate` models.

**Scope (files):**
- Create: `backend/src/common/models/nutrition-daily-log.model.ts`
- Create: all files under `backend/src/modules/nutrition/` listed in Affected Files
- Create: `backend/test/nutrition.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Reuse notes:**
- `MemberNutritionPlan` model already exists at `backend/src/common/models/member-nutrition-plan.model.ts` — register it in the module, do not redefine.
- `NutritionTemplate` model already exists at `backend/src/modules/nutrition-templates/nutrition-template.model.ts` — import its `name`/`schema` for the `assign-plan` lookup.
- Mirror `assignPlan` / `getHistory` scoping logic from `training.service.ts` (template must be owned by caller; trainer may only touch own members; member must have `role === 'member'`).
- Mirror `nutrition.dev.controller.ts` on `training.dev.controller.ts` (guarded by `NODE_ENV !== 'production'`, deactivates existing active plans, copies `template.dayTypes` + builds a default `schedule`).
- `NutritionDailyLog` has a unique index on `{ memberId, date }` — `getToday` must use upsert-safe find-or-create.

**Sprint Contract**:

*Unit tests:*
- [ ] `NutritionService > getMyPlan > returns the active MemberNutritionPlan with todayDayTypeName resolved from weeklyPattern when today's weekday matches an entry`
- [ ] `NutritionService > getMyPlan > falls back to dayTypes[0].name as todayDayTypeName when schedule has no matching override or pattern entry`
- [ ] `NutritionService > getMyPlan > returns null when the member has no active plan`
- [ ] `NutritionService > getToday > lazily creates a NutritionDailyLog with resolved dayTypeName and empty meal slots mirroring the prescribed meals when none exists for today`
- [ ] `NutritionService > getToday > returns the existing log unchanged when one already exists for today`
- [ ] `NutritionService > logFood > appends the item to the matching meal and returns the updated log`
- [ ] `NutritionService > logFood > throws NotFoundException when the named meal does not exist in today's log`
- [ ] `NutritionService > getSummary > returns logged totals summed from log items and target totals summed from the resolved day type`
- [ ] `NutritionService > assignNutritionPlan > deactivates prior active plans and creates a new one copying template dayTypes`
- [ ] `NutritionService > assignNutritionPlan > throws NotFoundException when the template is not owned by the caller`
- [ ] `NutritionService > assignNutritionPlan > throws NotFoundException when a trainer targets a member not assigned to them`
- [ ] `NutritionService > getHistory > returns the member's daily logs sorted by date descending`

*Integration tests (`backend/test/nutrition.e2e-spec.ts`, MongoMemoryServer, `maxWorkers: 1`):*
- [ ] `GET /nutrition/my-plan` as member with an assigned plan → 200, body has `todayDayTypeName` and non-empty `dayTypes`
- [ ] `GET /nutrition/my-plan` as member with no plan → 200, body is literally `null`
- [ ] `POST /nutrition/today/log` as member with `{ mealName, foodName, quantityG, kcal, protein, carbs, fat }` → 200, returned log's matching meal contains the new item
- [ ] `GET /nutrition/today/summary` after one logged item → 200, `logged.kcal` equals the logged item's kcal and `target.kcal` equals the prescribed day-type total
- [ ] `POST /nutrition/members/:memberId/assign-plan` as owner → 201, returned plan `isActive` true; prior plan deactivated
- [ ] `POST /nutrition/today/log` with no auth → 401; as owner (wrong role) → 403; with missing `mealName` → 400

**TDD sequence**:
1. Write `nutrition.service.spec.ts` for all 12 unit criteria → Red.
2. Implement `nutrition-daily-log.model.ts`, DTOs, `nutrition.service.ts` minimal → Green.
3. Write `nutrition.controller.spec.ts` (guards/roles wiring) + `nutrition.e2e-spec.ts` → Red.
4. Implement `nutrition.controller.ts`, `nutrition.dev.controller.ts`, `nutrition.module.ts`; register in `app.module.ts` → Green against real Mongo (MongoMemoryServer).
5. `/simplify` then `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build`.

**Status**: In Progress

### Stage 1 Checkpoint
- [x] `nutrition.service.spec.ts` (12 unit criteria) — Red
- [x] `nutrition-daily-log.model.ts`, DTOs, `nutrition.service.ts` — Green
- [x] `nutrition.controller.spec.ts` + `nutrition.e2e-spec.ts` — Red
- [x] `nutrition.controller.ts`, `nutrition.dev.controller.ts`, `nutrition.module.ts`, `app.module.ts` — Green
- [x] lint + build pass

---

## Stage 2: Mobile data layer (types, API, store)

**Goal**: A typed Zustand store + API client that fetches the plan, today's log, and macro summary, and logs a food item with optimistic-free refetch — fully unit tested with the `apiClient` mocked.

**Scope (files):**
- Create: `mobile/src/types/nutrition.ts` (all shapes from Shared Data Shapes above)
- Create: `mobile/src/lib/api/nutrition.api.ts` + `.spec.ts`
- Create: `mobile/src/stores/nutrition.store.ts` + `.spec.ts`

**Reuse notes:**
- Mirror `mobile/src/lib/api/training.api.ts` exactly for structure (named async fns wrapping `apiClient`).
- Mirror `mobile/src/stores/training.store.ts` for the store shape (`loading`/`error`, async actions, a derived selector). Reuse the `MacroFields`/`MealItem`/`DayType` definitions already conceptually present in `mobile/src/types/nutrition-templates.ts` — import and re-export rather than duplicate where identical.
- `apiClient` is mocked the same way `training.api.spec.ts`/`training.store.spec.ts` mock it.

**Store interface:**
```typescript
interface NutritionState {
  plan: ActiveNutritionPlan | null;
  todayLog: NutritionDailyLog | null;
  summary: MacroSummary | null;
  loading: boolean;
  error: string | null;

  fetchToday(): Promise<void>;             // fetches plan + today log + summary
  logFood(input: LogFoodInput): Promise<void>; // posts, then refetches log + summary
  loggedItemCount(): number;               // derived selector across todayLog meals
}
```

**Sprint Contract**:

*Unit tests:*
- [ ] `nutrition.api > fetchMyPlan > GETs /nutrition/my-plan and returns the parsed plan`
- [ ] `nutrition.api > logFood > POSTs /nutrition/today/log with the input body and returns the updated log`
- [ ] `nutrition.api > fetchTodaySummary > GETs /nutrition/today/summary and returns logged + target totals`
- [ ] `nutrition.store > fetchToday > populates plan, todayLog and summary and clears loading on success`
- [ ] `nutrition.store > fetchToday > sets error and clears loading when the API rejects`
- [ ] `nutrition.store > logFood > calls the log endpoint then refetches summary so totals reflect the new item`
- [ ] `nutrition.store > loggedItemCount > returns the total number of logged items across all meals`

*Integration criteria (mobile has no E2E in this stage — covered in Stage 3):*
- [ ] After `fetchToday` resolves with a plan and a one-item log, `summary.logged.kcal` is exposed on the store and matches the API payload (asserts wiring end-to-end through the mocked client).
- [ ] `logFood` followed by reading `summary` reflects updated `logged` totals (asserts refetch sequence, not stale state).

**TDD sequence**:
1. Write `nutrition.api.spec.ts` → Red → implement `nutrition.api.ts` → Green.
2. Write `nutrition.store.spec.ts` → Red → implement `nutrition.store.ts` → Green.
3. `/simplify` then `cd mobile && pnpm test && pnpm lint`.

**Status**: Complete

### Stage 2 Checkpoint
- [x] `mobile/src/types/nutrition.ts` — interfaces for all shared data shapes
- [x] `mobile/src/lib/api/nutrition.api.ts` + `nutrition.api.spec.ts` — 7 tests green
- [x] `mobile/src/stores/nutrition.store.ts` + `nutrition.store.spec.ts` — 7 tests green
- [x] lint + tsc (production files) pass

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: A working `MyNutritionScreen` showing the resolved day type, meal cards, and a live macro summary; a `LogFoodScreen` with a food picker + quantity input that adds an item and returns; trainer/owner assign action wired; Detox golden path passing on a simulator.

**Scope (files):**
- Create: `MyNutritionScreen.tsx` + `.spec.tsx`, `LogFoodScreen.tsx` + `.spec.tsx`, `components/MealCard.tsx`, `components/MacroSummary.tsx`
- Create: `mobile/e2e/member/my-nutrition.spec.ts`
- Modify: `mobile/src/navigation/index.tsx`, `mobile/src/screens/placeholders/index.ts`, `mobile/src/screens/members/MemberDetailScreen.tsx`

**Reuse notes:**
- `MyNutritionScreen` mirrors `MyTrainingScreen.tsx` structure: header pattern, loading skeleton, empty state (`nutrition-empty`), `ScrollView` of cards. Day-type label uses `testID={nutrition-day-type-${dayType}}`.
- `MealCard` uses `testID={meal-card-${mealId}}` where `mealId` is the meal's `order` (meals have no `_id`; use `order` for a stable key). Each card has a `log-food-button` that navigates to `LogFood` with the meal name.
- `MacroSummary` component: `testID="macro-summary"`, renders `logged / target` for kcal, protein, carbs, fat using the existing MacroPill tone conventions (emerald=protein, amber=carbs, pink=fat) from `.claude/instructions/design.md`.
- Food picker in `LogFoodScreen` reuses the existing food search pattern from `mobile/src/screens/nutrition-templates/components/FoodSearchSheet.tsx`. **Picker result rows use `testID={food-result-${food.name}}` (name, not `_id`).**
- Navigation: add `LogFood: { mealName: string }` to `AppStackParamList`; register an `AppStack.Screen`. Remove `MyNutritionScreen` from the placeholder factory and import the real screen in `SCREEN_REGISTRY`.
- Member-detail assign action mirrors the existing training assign control in `MemberDetailScreen.tsx`.

**Sprint Contract**:

*Unit tests (RTL):*
- [ ] `MyNutritionScreen > renders nutrition-day-type-{name} and a meal-card per prescribed meal when a plan is loaded`
- [ ] `MyNutritionScreen > renders nutrition-empty and no meal cards when the store plan is null`
- [ ] `MyNutritionScreen > renders macro-summary showing logged and target kcal from the store summary`
- [ ] `LogFoodScreen > tapping a food-result-{name} row and submitting a quantity calls store.logFood with the meal name and computed macros`
- [ ] `MealCard > log-food-button has an accessibilityLabel and navigates to LogFood with the meal name`

*E2E (Detox, `mobile/e2e/member/my-nutrition.spec.ts`, real simulator + backend dev seed):*
- [ ] Golden path: member logs in → opens drawer → taps `drawer-item-MyNutrition` → `screen-MyNutrition` visible → `nutrition-day-type-{seededDayType}` and at least one `meal-card-{order}` visible → taps `log-food-button` → `food-result-{seededFoodName}` visible → selects it, enters quantity, submits → returns to `screen-MyNutrition` → `macro-summary` logged kcal is greater than zero (totals updated).
- [ ] Edge case: a member seeded with **no** assigned plan opens My Nutrition → `nutrition-empty` is visible and no `meal-card-` element is visible.

**TDD sequence**:
1. Write component `.spec.tsx` files (store mocked) → Red → implement `MacroSummary`, `MealCard`, `MyNutritionScreen`, `LogFoodScreen` → Green.
2. Wire navigation + remove placeholder + add member-detail assign action.
3. Write `mobile/e2e/member/my-nutrition.spec.ts` (seed via `/auth/dev/seed-user-role` + `/nutrition/dev/seed`, mirror `my-training.spec.ts`) → build → run on simulator → passes.
4. `/simplify` then `cd mobile && pnpm test && pnpm lint`; then `pnpm detox build` + `pnpm detox test --testPathPattern=member/my-nutrition`.
5. Run the design-reviewer on `mobile/src/screens/my-nutrition/`.

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `MacroSummary.tsx`, `MealCard.tsx` components
- [x] `MyNutritionScreen.tsx` + `.spec.tsx`
- [x] `LogFoodScreen.tsx` + `.spec.tsx`
- [x] Navigation wiring + placeholder removal + MemberDetailScreen
- [x] `mobile/e2e/member/my-nutrition.spec.ts`
- [x] lint + tsc (production files) pass
