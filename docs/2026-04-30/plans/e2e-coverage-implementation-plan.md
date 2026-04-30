# E2E Coverage Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E specs for Health tab (member injuries), Equipment management, and Settings pages — all three roles.

**Architecture:** Each task adds one spec file (or modifies seed). Seed is updated first so all new specs have data to assert against. Tests follow the established pattern: `test.use({ storageState })`, `test.describe`, one `test()` per scenario. No app code is changed — only `e2e/` files.

**Tech Stack:** Playwright, TypeScript, Mongoose (seed only), Next.js App Router.

---

### Task 1: Seed — MemberInjury + Equipment records

**Files:**
- Modify: `e2e/seed.ts`

- [ ] **Step 1: Add imports and seed records**

In `e2e/seed.ts`, add imports at the top alongside existing ones:

```typescript
import { MemberInjuryModel } from '../src/lib/db/models/member-injury.model';
import { EquipmentModel } from '../src/lib/db/models/equipment.model';
```

Then add the following two blocks at the end of the `seed()` function (after the existing `// ── Invite Tokens` block):

```typescript
  // ── Member Injuries ───────────────────────────────────────────────────────
  await MemberInjuryModel.create({
    memberId: member._id,
    title: 'Left knee strain',
    status: 'active',
    recordedAt: new Date(),
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: 'Avoid squats, lunges',
  });

  // ── Equipment ─────────────────────────────────────────────────────────────
  // stable list item — never modified by any spec
  await EquipmentModel.create({
    name: 'E2E Barbell',
    category: 'strength',
    quantity: 1,
    status: 'active',
    purchasedAt: null,
    notes: null,
  });

  // dedicated to delete test — deleted by that spec only
  await EquipmentModel.create({
    name: 'E2E Delete Equipment',
    category: 'cardio',
    quantity: 1,
    status: 'active',
    purchasedAt: null,
    notes: null,
  });
```

- [ ] **Step 2: Verify seed compiles**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add e2e/seed.ts
git commit -m "test(e2e): add MemberInjury and Equipment seed records"
```

---

### Task 2: Health Tab E2E

**Files:**
- Create: `e2e/trainer/member-health.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/trainer/member-health.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToMemberHub(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  await page.getByText('Test Member').click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
}

test.describe('Trainer: Member Health Tab', () => {
  test('Health tab is visible in member hub nav', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByRole('link', { name: 'Health', exact: true })).toBeVisible();
  });

  test('Active section shows seeded injury', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);
    await expect(page.getByText('Left knee strain')).toBeVisible();
  });

  test('Add new injury appears in Active list', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);

    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByPlaceholder('e.g. Left knee ligament strain').fill('Shoulder impingement');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Shoulder impingement')).toBeVisible();
  });

  test('Resolve injury moves it to Resolved section', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);

    // Resolve the seeded injury
    const injuryRow = page.getByText('Left knee strain').locator('..').locator('..');
    await injuryRow.getByRole('button', { name: 'Resolve' }).click();

    // Should appear in Resolved section and disappear from Active
    const resolvedSection = page.locator('div').filter({ hasText: /^Resolved$/ }).locator('..');
    await expect(resolvedSection.getByText('Left knee strain')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm test:e2e -- e2e/trainer/member-health.spec.ts
```
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/trainer/member-health.spec.ts
git commit -m "test(e2e): add Health tab E2E spec"
```

---

### Task 3: Equipment E2E

**Files:**
- Create: `e2e/owner/equipment.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/owner/equipment.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Equipment', () => {
  test('list shows seeded equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Barbell')).toBeVisible();
  });

  test('create new equipment appears in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();

    await page.fill('#eq-name', 'E2E Treadmill');
    await page.selectOption('#eq-category', 'cardio');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('E2E Treadmill')).toBeVisible();
  });

  test('delete equipment removes it from list', async ({ page }) => {
    await page.goto('/owner/equipment');

    // Locate the row containing 'E2E Delete Equipment' and click its Delete button
    const row = page.getByText('E2E Delete Equipment').locator('..').locator('..');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('E2E Delete Equipment')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm test:e2e -- e2e/owner/equipment.spec.ts
```
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/owner/equipment.spec.ts
git commit -m "test(e2e): add Equipment management E2E spec"
```

---

### Task 4: Trainer Settings E2E

**Files:**
- Create: `e2e/trainer/settings.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/trainer/settings.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Settings', () => {
  test('save phone and bio — values persist after reload', async ({ page }) => {
    await page.goto('/trainer/settings');

    await page.fill('#phone', '0400000001');
    await page.fill('#bio', 'E2E trainer bio');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    // Wait for the server action to complete (button returns to non-pending state)
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000001');
    await expect(page.locator('#bio')).toHaveValue('E2E trainer bio');
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm test:e2e -- e2e/trainer/settings.spec.ts
```
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/trainer/settings.spec.ts
git commit -m "test(e2e): add Trainer settings E2E spec"
```

---

### Task 5: Member Settings E2E

**Files:**
- Create: `e2e/member/settings.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/member/settings.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Settings', () => {
  test('save phone — value persists after reload', async ({ page }) => {
    await page.goto('/member/settings');

    await page.fill('#phone', '0400000002');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000002');
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm test:e2e -- e2e/member/settings.spec.ts
```
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/member/settings.spec.ts
git commit -m "test(e2e): add Member settings E2E spec"
```

---

### Task 6: Owner Settings E2E

**Files:**
- Create: `e2e/owner/settings.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// e2e/owner/settings.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Settings', () => {
  test('save phone and gym name — values persist after reload', async ({ page }) => {
    await page.goto('/owner/settings');

    await page.fill('#phone', '0400000003');
    await page.fill('#gymName', 'E2E Gym');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000003');
    await expect(page.locator('#gymName')).toHaveValue('E2E Gym');
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm test:e2e -- e2e/owner/settings.spec.ts
```
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/owner/settings.spec.ts
git commit -m "test(e2e): add Owner settings E2E spec"
```

---

### Task 7: Docs Update

**Files:**
- Modify: `docs/INDEX.md`

- [ ] **Step 1: Run full E2E suite to confirm no regressions**

```bash
pnpm test:e2e
```
Expected: All specs pass (including pre-existing ones).

- [ ] **Step 2: Update INDEX.md**

In `docs/INDEX.md`, update the E2E Coverage row under Specs & Designs from `Draft` to `Approved`, and add a row to Implementation Plans:

```markdown
| E2E Coverage Completion | [e2e-coverage-design.md](2026-04-30/plans/e2e-coverage-design.md) | Approved |
```

```markdown
| E2E Coverage Completion | [e2e-coverage-implementation-plan.md](2026-04-30/plans/e2e-coverage-implementation-plan.md) | Complete |
```

- [ ] **Step 3: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark E2E coverage completion as complete"
```
