# Nutrition Plan Redesign — POWER_GYM

**Date**: 2026-05-05  
**Status**: Approved  
**Supersedes**: `docs/2026-04-22/plans/nutrition-design.md`

---

## Overview

Full redesign of the nutrition plan feature. Key changes from v1:

- Owner and trainer no longer have personal nutrition plans; they are plan administrators only
- Plan history is preserved on reassignment (soft deactivation, already in place)
- Members get a daily food diary: view today's plan, log actual food eaten, mark meals/day complete
- Trainer and owner schedule day types per member via weekly pattern or calendar overrides
- Food entry supports two modes: OpenFoodFacts API search (auto-fill) or full manual entry
- Extended macros (fiber, sugar, salt, saturated, polyunsaturated, monounsaturated, polyols) added to food items only — daily targets keep the base four (kcal, protein, carbs, fat)

---

## Data Models

### MealItem (modified)

Remove `foodId` foreign key (pure snapshot). Add optional extended macros.

```ts
{
  foodName: string,
  quantityG: number,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  // optional — from OpenFoodFacts or manual entry
  fiber?: number,
  sugar?: number,
  salt?: number,
  saturated?: number,
  polyunsaturated?: number,
  monounsaturated?: number,
  polyols?: number,
}
```

Applied to both `NutritionTemplate` and `MemberNutritionPlan`.

---

### MemberNutritionPlan (modified)

Two changes: `templateId` becomes optional (direct plan creation); `trainerId` renamed `assignedById` (owner can also assign); `schedule` field added.

```ts
{
  memberId: ObjectId,
  assignedById: ObjectId,       // owner or trainer
  templateId?: ObjectId,        // null when created directly
  name: string,
  isActive: boolean,
  assignedAt: Date,
  dayTypes: [...],              // structure unchanged
  schedule: {
    weeklyPattern: [
      { dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6, dayTypeName: string }
    ],
    calendarOverrides: [
      { date: string, dayTypeName: string }   // "YYYY-MM-DD"
    ]
  }
}
```

**Day type resolution**: check `calendarOverrides` for today's date first; fall back to `weeklyPattern[dayOfWeek]`; return `null` if neither matches.

This logic lives in a pure function `resolveDayType(schedule, date): string | null` in `src/lib/nutrition/schedule.ts`.

---

### NutritionDailyLog (new collection)

Records what a member actually ate on a given calendar date.

```ts
{
  memberId: ObjectId,
  planId: ObjectId,
  date: string,                 // "YYYY-MM-DD" UTC
  dayTypeName: string,
  meals: [
    {
      name: string,
      order: number,
      completed: boolean,
      items: [MealItem],        // actual items — may differ from plan
    }
  ],
  dayCompleted: boolean,
}
// Index: (memberId, date) unique
// timestamps: true
```

A log is initialised on first interaction. `GET /log/[date]` returns the plan structure (not yet persisted) when no log exists for that date, so the first `PUT` creates it.

Once `dayCompleted: true`, further `PUT` requests return 403.

---

## API Routes

### New routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/food-search?q={query}&page_size={n}` | trainer / owner | Proxy to OpenFoodFacts; returns normalised results |
| `PATCH` | `/api/members/[memberId]/nutrition/schedule` | trainer / owner | Update `schedule` on the active plan |
| `GET` | `/api/members/[memberId]/nutrition/history` | trainer / owner | All plans for member (active + inactive) |
| `GET` | `/api/members/[memberId]/nutrition/log/[date]` | self / trainer / owner | Daily log; returns plan structure if no log exists yet |
| `PUT` | `/api/members/[memberId]/nutrition/log/[date]` | self (member only) | Upsert full log; 403 if dayCompleted |

### Modified routes

**`POST /api/members/[memberId]/nutrition`** — body accepts two shapes:

```ts
// From template (existing flow)
{ templateId: string }

// Direct creation (new)
{ name: string, dayTypes: DayType[] }
```

Both paths deactivate all existing plans first, then create a new active plan.

### `/api/food-search` implementation detail

Calls `https://world.openfoodfacts.org/cgi/search.pl?search_terms={q}&search_simple=1&action=process&json=1&page_size={n}&fields=product_name,nutriments` with `User-Agent: PowerGym/1.0`.

Response is normalised to:

```ts
{
  results: Array<{
    name: string,
    per100g: {
      kcal: number,
      protein: number,
      carbs: number,
      fat: number,
      fiber?: number,       // nutriments.fiber_100g
      sugar?: number,       // nutriments.sugars_100g
      salt?: number,        // nutriments.salt_100g
      saturated?: number,   // nutriments['saturated-fat_100g']
    }
  }>
}
```

Field mapping from OpenFoodFacts:
- `energy-kcal_100g` → kcal
- `proteins_100g` → protein
- `carbohydrates_100g` → carbs
- `fat_100g` → fat
- `fiber_100g` → fiber (optional — not always present)
- `sugars_100g` → sugar (optional)
- `salt_100g` → salt (optional)
- `saturated-fat_100g` → saturated (optional)
- `polyunsaturated-fat_100g`, `monounsaturated-fat_100g`, `polyols` — **not reliably present in OpenFoodFacts**; manual-entry only

**Caching**: in-memory LRU cache, 100 entries, 5-minute TTL. Prevents hitting the 10 req/min rate limit on repeated searches.

**Attribution**: any UI that displays OpenFoodFacts results must show "Powered by Open Food Facts".

**No API key required.** Read operations are fully open; only the `User-Agent` header is mandatory.

---

## UI Pages

### Removed
- `/owner/my-nutrition` — deleted entirely

### Design Principles (enforced throughout)
- Forms never appear alongside list views. All create/edit/assign actions open a **Dialog** or **Sheet**.
- Cards and table rows are information-dense. Multiple data points per row; no large whitespace blocks.
- Overlays (Dialog, Sheet) keep the list page clean and the main view uncluttered.

---

### Member: `/member/nutrition`

Daily food diary. Display-only page; all interactions open overlays.

**Layout:**
```
Wed, May 6 · Day 1 · Training Day          ← → date nav
──────────────────────────────────────────
Fiber 26g  Sugar 49g  Salt 2g  Sat 24g  Poly 10g  Mono 32g
──────────────────────────────────────────
Breakfast                    572/572 kcal · 35g P · 46g C · 27g F
  Egg (4 large)              280  24g   0g  20g
  Helgas Light Rye (68g)     232  8.5g 45g   2g
  [+ Add Food]                          [✓ Complete]

Main Meal                    863/863 kcal · ...
  ...
  [+ Add Food]                          [✓ Complete]

[+ Add Meal]
─────────────────────
      [Complete Day]
```

- Food rows: name left-aligned, kcal/P/C/F as compact right-aligned columns
- Date nav: past and today only — cannot navigate to future
- No schedule for today → `EmptyState`: "Your trainer hasn't scheduled today yet"
- `[+ Add Food]` → `FoodAddSheet` (slide-up)
- `[+ Add Meal]` → small Dialog (meal name input only)
- `[Complete Day]` → confirm Dialog → locks day (further PUT returns 403)

---

### Shared component: `FoodAddSheet`

Bottom Sheet with two tabs: **Search** and **Manual**.

**Search tab:**
- Debounced input (300 ms) → calls `/api/food-search?q=X`
- Results list: `Name · kcal · Pg · Cg · Fg` per row, compact
- Select result → Amount field appears → auto-calculates all macros at `quantityG / 100 * per100g`
- "Powered by Open Food Facts" attribution line

**Manual tab:**
- Two-column grid (IMG_6402 layout): Name, Kcal, Protein, Carbs, Fat, Fiber, Polyunsaturated, Sugar, Monounsaturated, Polyols, Saturated, Salt, Serving Size, Serving Description, Amount
- Amount field auto-recalculates if per-100g values were entered first

Used by both member daily log and trainer template builder.

---

### Trainer: `/trainer/nutrition`

Compact template list — table layout, one row per template:

```
Name               Day Types  Created       Actions
────────────────────────────────────────────────
Off Season Bulk    3          2026-04-10    [Edit] [Delete]
Contest Prep       2          2026-03-22    [Edit] [Delete]
```

`[+ New Template]` → dedicated page (template building is complex enough to warrant full page).

---

### Trainer: `/trainer/nutrition/new` and `/trainer/nutrition/[id]/edit`

Full-page template builder.

- Add/edit Day Type → **Dialog** (name + 4 target fields)
- Food items displayed as compact rows: `Name (qty)  kcal  P  C  F  [×]`
- `[+ Add Food]` → `FoodAddSheet`

---

### Trainer: `/trainer/members/[id]/nutrition`

Three tabs: **Current Plan** · **History** · **Schedule**

**Current Plan tab:**
```
Off Season Bulk · 3 day types · Assigned 2026-04-10    [Assign New ▼]
──────────────────────────────────────
Training Day  2800 kcal  200g P  300g C  80g F
Rest Day      2200 kcal  180g P  220g C  75g F
High Carb     3100 kcal  190g P  380g C  70g F
```

`[Assign New ▼]` dropdown: **From Template** → Dialog (select template → confirm) | **Create Direct** → navigate to new plan page with memberId pre-filled.

**History tab:**
```
Plan Name        Assigned     Deactivated   Day Types
────────────────────────────────────────────────────
Contest Prep     2026-02-01   2026-04-10    2
Winter Bulk      2025-11-15   2026-02-01    3
```

**Schedule tab:**
```
Mode: [Weekly Pattern]  [Calendar Overrides]

Mon [Training Day ▼]  Tue [Rest Day ▼]  Wed [Training Day ▼]
Thu [Rest Day ▼]      Fri [Training Day ▼]  Sat [High Carb ▼]
Sun [Rest Day ▼]
                                          [Save Pattern]

Calendar Overrides
2026-05-01  Training Day                              [×]
2026-05-05  Rest Day                                  [×]
[+ Add Override]  → small Dialog (date picker + day type select)
```

---

### Owner

- `/owner/nutrition-templates` — reuses trainer template list component
- `/owner/members/[id]/nutrition` — reuses trainer member nutrition page component; role from session drives permission checks

---

## Shared Components (new)

| Component | Path | Used by |
|-----------|------|---------|
| `FoodAddSheet` | `src/components/nutrition/food-add-sheet.tsx` | Member daily log, trainer template builder |
| `ScheduleEditor` | `src/components/nutrition/schedule-editor.tsx` | Trainer/owner member nutrition page |
| `DailyNutritionView` | `src/components/nutrition/daily-nutrition-view.tsx` | Member nutrition page |
| `MealCard` | `src/components/nutrition/meal-card.tsx` | Inside DailyNutritionView |

---

## Testing Strategy

### Unit tests (Jest)

| File | Covers |
|------|--------|
| `__tests__/lib/nutrition/macros.test.ts` | Extended field calculation (fiber/sugar/salt proportional to quantityG) |
| `__tests__/lib/nutrition/schedule.test.ts` | `resolveDayType` — calendarOverrides priority, weeklyPattern fallback, null when no match |
| `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts` | Optional templateId; assignedById field |
| `__tests__/lib/repositories/nutrition-daily-log.repository.test.ts` | upsert, findByDate, unique (memberId, date) constraint |

### API route tests (Jest)

| File | Covers |
|------|--------|
| `__tests__/app/api/food-search.test.ts` | Mock OpenFoodFacts response → correct field mapping; cache hit skips external call; empty q returns 400 |
| `__tests__/app/api/members-nutrition.test.ts` | Direct plan creation (no templateId); owner can assign; trainer limited to own members |
| `__tests__/app/api/nutrition-schedule.test.ts` | PATCH updates schedule; trainer cannot update other trainer's member |
| `__tests__/app/api/nutrition-log.test.ts` | GET returns plan structure when no log; PUT upserts; member cannot write others' log; 403 after dayCompleted |
| `__tests__/app/api/nutrition-history.test.ts` | Returns all plans; trainer scoped to own members |

### Component tests (Jest + RTL)

| File | Covers |
|------|--------|
| `__tests__/app/member/daily-nutrition-view.test.tsx` | No schedule → EmptyState; log renders meals; Complete toggles state |
| `__tests__/app/shared/food-add-sheet.test.tsx` | Debounce triggers search; manual tab auto-calculates macros |
| `__tests__/app/trainer/nutrition-schedule-editor.test.tsx` | Mode switch; add override Dialog; save calls PATCH |
| `__tests__/app/trainer/trainer-member-nutrition.test.tsx` | Three tabs render; Assign Dialog flow |

### E2E tests (Playwright)

| Scenario | File |
|---------|------|
| Trainer builds template → assigns to member → sets schedule | `e2e/trainer/nutrition-full-flow.spec.ts` |
| Member opens daily log → adds food → completes meal → Complete Day | `e2e/member/nutrition-daily-log.spec.ts` |

---

## Files to Delete

- `src/app/(dashboard)/owner/my-nutrition/` — entire directory

## Key lib files

| File | Purpose |
|------|---------|
| `src/lib/nutrition/schedule.ts` | `resolveDayType(schedule, date)` pure function |
| `src/lib/nutrition/macros.ts` | Update `calculateMacros` to handle extended fields |
| `src/lib/nutrition/food-search.ts` | OpenFoodFacts fetch + field mapping + LRU cache |
| `src/lib/db/models/nutrition-daily-log.model.ts` | New Mongoose model |
| `src/lib/repositories/nutrition-daily-log.repository.ts` | Repository interface + Mongo impl |
