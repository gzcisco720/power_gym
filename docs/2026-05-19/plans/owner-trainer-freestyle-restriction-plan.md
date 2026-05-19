# Owner/Trainer Freestyle Day Restriction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the same freestyle day view restrictions to owner/trainer as member — today-only (no ← → date navigation) when entering via the Freestyle "Log Today" button, and prevent re-logging if today's freestyle log is already completed.

**Architecture:** Three-layer change. (1) `NutritionFreestylePathCard` generalises the `todayLog` CTA from member-only to all roles, and appends `?noNav=1` to owner/trainer freestyle URLs. (2) `MyNutritionLanding` fetches today's owner/trainer freestyle log server-side and passes it as `todayLog`. (3) Owner/trainer day pages read `noNav` and pass `noDateNav={true}` through `SelfNutritionDayViewWithRouter` to `SelfNutritionDayView` (which already accepts `noDateNav`). Calendar-based navigation (📅 popover) is unaffected — it does not append `noNav`.

**Tech Stack:** Next.js App Router, TypeScript strict, Shadcn/ui, Playwright E2E.

---

## File Map

| File | Change |
|---|---|
| `src/components/self-tracking/nutrition-freestyle-path-card.tsx` | Generalise `todayLog` CTA from member-only → all roles; add `noNav=1` to owner/trainer URL |
| `src/components/self-tracking/my-nutrition-landing.tsx` | Fetch today's freestyle log; pass `todayLog` to all `NutritionFreestylePathCard` renders |
| `src/app/(dashboard)/owner/my-nutrition/day/page.tsx` | Read `noNav` searchParam; pass `noDateNav` to router wrapper |
| `src/app/(dashboard)/trainer/my-nutrition/day/page.tsx` | Same as owner page |
| `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx` | Add `noDateNav` prop; pass to `SelfNutritionDayView` |
| `src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx` | Same as owner wrapper |
| `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx` | Tests for owner CTA states |
| `e2e/self-tracking/owner-freestyle-restriction.spec.ts` | Deep E2E for all restriction behaviors |

---

### Task 1: Generalise todayLog CTA in NutritionFreestylePathCard

**Files:**
- Modify: `src/components/self-tracking/nutrition-freestyle-path-card.tsx`
- Modify: `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx`

**Background:** Currently `NutritionFreestylePathCard` has `const isMember = props.basePath === '/member/nutrition'` and gates the `todayLog` CTA behind `isMember && todayLog != null`. This task removes that gate and renames `memberTodayCTA` → `todayCTA`. It also updates `freestyleDayPath` to append `&noNav=1` for non-member paths so the day page knows to suppress date navigation.

- [ ] **Step 1: Write failing tests**

Add to `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx`:

```typescript
// Owner: shows "Continue Today's Log" when incomplete log today
it('shows Continue Today log button for owner when incomplete log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/owner/my-nutrition"
      todayLog={{ kcal: 900, dayCompleted: false }}
    />,
  );
  expect(screen.getByRole('button', { name: /continue today/i })).toBeInTheDocument();
});

// Owner: shows "View Today's Log" when completed log today
it('shows View Today log button for owner when completed log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/owner/my-nutrition"
      todayLog={{ kcal: 2000, dayCompleted: true }}
    />,
  );
  expect(screen.getByRole('button', { name: /view today/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /log today/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL**
```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 3: Implement changes in the component**

**Change 1 — rename `memberTodayCTA` → `todayCTA` and remove `isMember &&`:**

Find:
```typescript
const isMember = props.basePath === '/member/nutrition';
const todayLog = props.todayLog;

const memberTodayCTA =
  isMember && todayLog != null ? (
```

Replace with:
```typescript
const todayLog = props.todayLog;

const todayCTA =
  todayLog != null ? (
```

**Change 2 — rename all uses of `memberTodayCTA` → `todayCTA`** (there are two: one in the empty state render, one in the light/full render).

**Change 3 — update `freestyleDayPath` to append `noNav=1` for non-member:**

Find:
```typescript
function freestyleDayPath(basePath: BasePath): string {
  if (basePath === '/member/nutrition') {
    return `/member/nutrition/day?date=${todayISO()}&mode=free`;
  }
  return `${basePath}/day?date=${todayISO()}`;
}
```

Replace with:
```typescript
function freestyleDayPath(basePath: BasePath): string {
  if (basePath === '/member/nutrition') {
    return `/member/nutrition/day?date=${todayISO()}&mode=free`;
  }
  // noNav=1 tells the day page to suppress date navigation (today-only)
  return `${basePath}/day?date=${todayISO()}&noNav=1`;
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 5: Lint**
```bash
pnpm lint
```

- [ ] **Step 6: Commit**
```bash
git add src/components/self-tracking/nutrition-freestyle-path-card.tsx __tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx
git commit -m "feat(nutrition): generalise todayLog CTA to all roles in NutritionFreestylePathCard"
```

---

### Task 2: MyNutritionLanding fetches today's log and passes todayLog

**Files:**
- Modify: `src/components/self-tracking/my-nutrition-landing.tsx`

**Background:** Currently `MyNutritionLanding` doesn't check today's freestyle log at all. It needs to call `logRepo.findByDate(userId, todayISO)` and pass `todayLog` to every `NutritionFreestylePathCard` render.

No unit tests needed — server components are covered by E2E.

- [ ] **Step 1: Add today's log lookup**

In `src/components/self-tracking/my-nutrition-landing.tsx`, after the existing `await Promise.all([...])` block (which fetches `monthLogs`, `recent`, `templates`), add:

```typescript
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayFreestyleLog = await logRepo.findByDate(userId, todayISO);
  const todayFreestyleLogSummary =
    todayFreestyleLog != null
      ? {
          kcal: Math.round(
            todayFreestyleLog.meals.reduce(
              (s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0),
              0,
            ),
          ),
          dayCompleted: todayFreestyleLog.dayCompleted,
        }
      : null;
```

- [ ] **Step 2: Pass todayLog to all NutritionFreestylePathCard renders**

There are three renders. Add `todayLog={todayFreestyleLogSummary}` to each:

```typescript
{!lastFreestyleLog && (
  <NutritionFreestylePathCard
    state="empty"
    basePath={basePath}
    todayLog={todayFreestyleLogSummary}
  />
)}
{lastFreestyleLog && state === 'full' && (
  <NutritionFreestylePathCard
    state="full"
    lastFreestyle={toLastFreestyle(lastFreestyleLog)}
    daysThisWeek={countDaysThisWeek(recent)}
    basePath={basePath}
    todayLog={todayFreestyleLogSummary}
  />
)}
{lastFreestyleLog && state !== 'full' && (
  <NutritionFreestylePathCard
    state="light"
    lastFreestyle={toLastFreestyle(lastFreestyleLog)}
    basePath={basePath}
    todayLog={todayFreestyleLogSummary}
  />
)}
```

- [ ] **Step 3: Build check**
```bash
pnpm build 2>&1 | grep -E "Type error|error TS" | grep -v node_modules | head -10
```
Expected: empty output.

- [ ] **Step 4: Lint**
```bash
pnpm lint
```

- [ ] **Step 5: Commit**
```bash
git add src/components/self-tracking/my-nutrition-landing.tsx
git commit -m "feat(nutrition): MyNutritionLanding passes today freestyle log to FreestylePathCard"
```

---

### Task 3: Owner/trainer day pages + wrappers support noNav param

**Files:**
- Modify: `src/app/(dashboard)/owner/my-nutrition/day/page.tsx`
- Modify: `src/app/(dashboard)/trainer/my-nutrition/day/page.tsx`
- Modify: `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx`
- Modify: `src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx`

**Background:** When the freestyle card navigates to `/owner/my-nutrition/day?date=TODAY&noNav=1`, the page reads `noNav` and passes `noDateNav={true}` through the wrapper to `SelfNutritionDayView`. When navigating from the calendar popover or template card (which do NOT append `noNav=1`), `noDateNav` defaults to `false` and date navigation works normally.

No unit tests — covered by E2E.

- [ ] **Step 1: Update both day-view-with-router.tsx files**

Both `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx` and `src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx` need the same change.

Current `Props` interface:
```typescript
interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
  initialTemplateId?: string;
  initialDayTypeName?: string;
}
```

New `Props` interface (add `noDateNav`):
```typescript
interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
  initialTemplateId?: string;
  initialDayTypeName?: string;
  noDateNav?: boolean;
}
```

Current function body in both files:
```typescript
export function SelfNutritionDayViewWithRouter({ initialDate, basePath, initialTemplateId, initialDayTypeName }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`${basePath}/day?date=${d}`, { scroll: false });
    },
    [router, basePath],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={onDateChange}
      initialTemplateId={initialTemplateId}
      initialDayTypeName={initialDayTypeName}
    />
  );
}
```

New function body (pass `noDateNav`, suppress `onDateChange` when `noDateNav`):
```typescript
export function SelfNutritionDayViewWithRouter({ initialDate, basePath, initialTemplateId, initialDayTypeName, noDateNav = false }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      router.push(`${basePath}/day?date=${d}`, { scroll: false });
    },
    [router, basePath],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={noDateNav ? undefined : onDateChange}
      initialTemplateId={initialTemplateId}
      initialDayTypeName={initialDayTypeName}
      noDateNav={noDateNav}
    />
  );
}
```

- [ ] **Step 2: Update both day page files to read noNav**

For `src/app/(dashboard)/owner/my-nutrition/day/page.tsx`:

```typescript
interface PageProps {
  searchParams: Promise<{ date?: string; templateId?: string; dayTypeName?: string; noNav?: string }>;
}

export default async function OwnerMyNutritionDayPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  const { date: rawDate, templateId, dayTypeName, noNav } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  return (
    <SelfNutritionDayViewWithRouter
      initialDate={date}
      basePath="/owner/my-nutrition"
      initialTemplateId={templateId}
      initialDayTypeName={dayTypeName}
      noDateNav={noNav === '1'}
    />
  );
}
```

Apply the same change to `src/app/(dashboard)/trainer/my-nutrition/day/page.tsx` (change role check to `'trainer'` and basePath to `"/trainer/my-nutrition"`).

- [ ] **Step 3: Build check**
```bash
pnpm build 2>&1 | grep -E "Type error|error TS" | grep -v node_modules | head -10
```
Expected: empty output.

- [ ] **Step 4: Lint**
```bash
pnpm lint
```

- [ ] **Step 5: Commit**
```bash
git add "src/app/(dashboard)/owner/my-nutrition/day/page.tsx" "src/app/(dashboard)/trainer/my-nutrition/day/page.tsx" "src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx" "src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx"
git commit -m "feat(nutrition): owner/trainer day page passes noDateNav when entering via freestyle"
```

---

### Task 4: E2E tests — owner freestyle restriction

**Files:**
- Create: `e2e/self-tracking/owner-freestyle-restriction.spec.ts`

**Background:** These tests verify that:
1. When the owner clicks "Log Today (Freestyle)" from the landing, the day view has no date navigation.
2. If today's freestyle log is not yet started, the card shows "Log Today (Freestyle)" (or similar).
3. If today's freestyle log is incomplete, the card shows "Continue Today's Log".
4. If today's freestyle log is completed, the card shows "View Today's Log" and the day view is read-only.
5. Calendar-based navigation (📅) still works with full date nav (not noNav).

The trainer behaves identically — a comment in the test file notes this and uses the owner auth for brevity (both roles share the same `SelfNutritionDayView` and `NutritionFreestylePathCard` logic).

- [ ] **Step 1: Read reference patterns**

Before implementing, read:
- `e2e/self-tracking/owner-nutrition-day.spec.ts` — auth pattern, API seeding with `request.put`, teardown
- `e2e/member/member-nutrition-redesign.spec.ts` — the member equivalent tests for structural reference

- [ ] **Step 2: Create spec file**

```typescript
// e2e/self-tracking/owner-freestyle-restriction.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function deleteTodayFreestyleLog(request: import('@playwright/test').APIRequestContext) {
  await request.delete(`/api/me/nutrition-logs/${TODAY}`);
}

async function seedTodayFreestyleLog(
  request: import('@playwright/test').APIRequestContext,
  opts: { dayCompleted: boolean; kcal?: number },
) {
  const kcal = opts.kcal ?? 800;
  const res = await request.put(`/api/me/nutrition-logs/${TODAY}`, {
    data: {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      dayCompleted: opts.dayCompleted,
      meals: [
        {
          name: 'Breakfast',
          order: 0,
          completed: opts.dayCompleted,
          items: [{ foodName: 'Egg', quantityG: 100, kcal, protein: 12, carbs: 1, fat: 10 }],
        },
        { name: 'Lunch', order: 1, completed: false, items: [] },
        { name: 'Dinner', order: 2, completed: false, items: [] },
        { name: 'Snack', order: 3, completed: false, items: [] },
      ],
    },
  });
  expect(res.ok()).toBe(true);
}

// ── Freestyle card: today-only, prevent re-log ────────────────────────────────

test.describe('Owner: Freestyle card — today only, no double-log', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('shows "Log Today (Freestyle)" when no log exists for today', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    // Freestyle card visible, no Continue/View
    await expect(page.getByText('Freestyle')).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test('shows "Continue Today\'s Log" when incomplete freestyle log exists', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 900 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /log today \(freestyle\)/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();
  });

  test('shows "View Today\'s Log" when completed freestyle log exists', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
  });

  test('"Continue Today\'s Log" navigates to freestyle day view', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 900 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /continue today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });
  });

  test('"View Today\'s Log" navigates to freestyle day view', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /view today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });
  });
});

// ── Freestyle day view: no date navigation when noNav=1 ───────────────────────

test.describe('Owner: Freestyle day view — no date navigation when via freestyle card', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('no ← and → navigation buttons when noNav=1', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1000);

    // Must NOT have prev/next navigation buttons
    const arrows = page.getByRole('button').filter({ hasText: /←|→/ });
    const count = await arrows.count();
    for (let i = 0; i < count; i++) {
      await expect(arrows.nth(i)).not.toBeVisible();
    }
  });

  test('date shown as plain centered text — no calendar popover trigger when noNav=1', async ({ page }) => {
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1000);

    await expect(page.getByText(TODAY)).toBeVisible();
    await expect(page.getByRole('button', { name: /open calendar/i })).not.toBeVisible();
  });

  test('normal date navigation still works WITHOUT noNav param (calendar path)', async ({ page }) => {
    // When accessed via calendar (no noNav), date navigation IS present
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}`);
    await page.waitForTimeout(1000);

    // Should have ← nav button (going back in time is always allowed)
    await expect(page.getByRole('button', { name: /←/ })).toBeVisible({ timeout: 5000 });
  });

  test('completed freestyle log is read-only when noNav=1', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2000 });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1500);

    await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible({ timeout: 8000 });
    // Add Food buttons should be disabled (locked state)
    const addFoodBtns = page.getByRole('button', { name: /\+ add food/i });
    const btnCount = await addFoodBtns.count();
    for (let i = 0; i < btnCount; i++) {
      await expect(addFoodBtns.nth(i)).toBeDisabled();
    }
  });

  test('incomplete freestyle log is editable when noNav=1', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1500);

    await expect(page.getByRole('button', { name: /\+ add food/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /mark day complete/i })).toBeVisible();
  });

  test('Complete Day confirm dialog and submit path', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false });
    await page.goto(`/owner/my-nutrition/day?date=${TODAY}&noNav=1`);
    await page.waitForTimeout(1500);

    // Open confirm dialog
    await page.getByRole('button', { name: /mark day complete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/mark today as complete/i)).toBeVisible();

    // Cancel path
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /mark day complete/i })).toBeVisible();

    // Submit path
    await page.getByRole('button', { name: /mark day complete/i }).click();
    const confirmBtn = page.getByRole('button', { name: /mark all & submit|submit/i }).first();
    await confirmBtn.click();

    // Wait for animation to complete and check completed state
    await page.waitForTimeout(3000);
    await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /day completed/i })).toBeDisabled();
  });
});

// ── Full lifecycle ────────────────────────────────────────────────────────────

test.describe('Owner: Freestyle lifecycle — landing card reflects state changes', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('landing card transitions from Log Today → Continue → View as log progresses', async ({ page, request }) => {
    // 1. No log: landing shows no Continue/View
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /view today/i })).not.toBeVisible();

    // 2. Incomplete log: landing shows Continue
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 700 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });

    // 3. Completed log: landing shows View
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('button', { name: /continue today/i })).not.toBeVisible();
  });

  test('"Log Today (Freestyle)" from landing navigates with noNav=1', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/owner/my-nutrition');
    await page.waitForLoadState('networkidle');

    const logTodayBtn = page.getByRole('button', { name: /log today \(freestyle\)/i });
    await expect(logTodayBtn).toBeVisible({ timeout: 6000 });
    await logTodayBtn.click();

    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day.*noNav=1/, { timeout: 5000 });
    // And no date navigation in that view
    const arrows = page.getByRole('button').filter({ hasText: /←|→/ });
    const count = await arrows.count();
    for (let i = 0; i < count; i++) {
      await expect(arrows.nth(i)).not.toBeVisible();
    }
  });
});
```

- [ ] **Step 3: Run the spec**
```bash
pnpm test:e2e -- --spec "e2e/self-tracking/owner-freestyle-restriction.spec.ts" 2>&1 | tail -20
```

Fix any selector/timing issues until all tests pass.

- [ ] **Step 4: Commit**
```bash
git add e2e/self-tracking/owner-freestyle-restriction.spec.ts
git commit -m "test(e2e): deep E2E for owner/trainer freestyle day restriction"
```

---

### Task 5: Final checks

- [ ] **Step 1: Full unit tests**
```bash
pnpm test 2>&1 | grep "^Tests:"
```
Expected: same 15 pre-existing failures, no new failures.

- [ ] **Step 2: Lint**
```bash
pnpm lint
```

- [ ] **Step 3: Production build**
```bash
pnpm build 2>&1 | tail -3
```

- [ ] **Step 4: Full E2E**
```bash
pnpm test:e2e 2>&1 | tail -10
```

- [ ] **Step 5: Update INDEX.md** — add row:
```
| Owner/Trainer Freestyle Restriction (Plan) | [owner-trainer-freestyle-restriction-plan.md](2026-05-19/plans/owner-trainer-freestyle-restriction-plan.md) | Complete |
```

- [ ] **Step 6: Commit**
```bash
git add docs/INDEX.md
git commit -m "docs: mark owner/trainer freestyle restriction plan complete"
```
