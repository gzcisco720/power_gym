import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Body Tests', () => {
  async function goToBodyTestsTab(page: import('@playwright/test').Page) {
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'View Hub →' }).first().click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);
  }

  test('existing seeded body tests are visible on page load', async ({ page }) => {
    await goToBodyTestsTab(page);
    // Latest seeded member test: weight 75, BF 18.0%
    await expect(page.getByText('75kg').first()).toBeVisible();
    await expect(page.getByText('18.0%').first()).toBeVisible();
  });

  // The dialog form lives behind the "New Test" button. Age & sex come from
  // the member's profile — no #age input exists on screen.
  async function openNewTestDialog(page: import('@playwright/test').Page) {
    await goToBodyTestsTab(page);
    await page.getByRole('button', { name: 'New Test' }).click();
    await expect(page.getByRole('heading', { name: 'New Body Test' })).toBeVisible();
  }

  test('add new body test for member', async ({ page }) => {
    await openNewTestDialog(page);

    await page.selectOption('#nbt-protocol', '3site');
    await page.fill('#nbt-weight', '76');
    await page.fill('#nbt-chest', '21');
    await page.fill('#nbt-abdominal', '26');
    await page.fill('#nbt-thigh', '16');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('76kg').first()).toBeVisible({ timeout: 8000 });
  });

  test('add 7-site body test for member', async ({ page }) => {
    await openNewTestDialog(page);

    await page.selectOption('#nbt-protocol', '7site');
    await page.fill('#nbt-weight', '77');
    await page.fill('#nbt-chest', '20');
    await page.fill('#nbt-midaxillary', '15');
    await page.fill('#nbt-tricep', '12');
    await page.fill('#nbt-subscapular', '18');
    await page.fill('#nbt-abdominal', '25');
    await page.fill('#nbt-suprailiac', '14');
    await page.fill('#nbt-thigh', '16');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('77kg').first()).toBeVisible({ timeout: 8000 });
  });

  test('add 9-site body test for member', async ({ page }) => {
    await openNewTestDialog(page);

    await page.selectOption('#nbt-protocol', '9site');
    await page.fill('#nbt-weight', '78');
    await page.fill('#nbt-tricep', '12');
    await page.fill('#nbt-chest', '20');
    await page.fill('#nbt-subscapular', '18');
    await page.fill('#nbt-abdominal', '25');
    await page.fill('#nbt-suprailiac', '14');
    await page.fill('#nbt-thigh', '16');
    await page.fill('#nbt-midaxillary', '15');
    await page.fill('#nbt-bicep', '10');
    await page.fill('#nbt-lumbar', '20');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('78kg').first()).toBeVisible({ timeout: 8000 });
  });

  // ── Trend chart (seed has 6 body tests → chart should render) ────────────
  test('body test tab shows trend chart with multiple historical tests', async ({ page }) => {
    await goToBodyTestsTab(page);
    // Recharts renders a container when chart data is present (≥2 tests)
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
  });

  test('add manual (other protocol) body test for member', async ({ page }) => {
    await openNewTestDialog(page);

    // Default protocol is '3site'; switch to 'other' for manual entry
    await page.selectOption('#nbt-protocol', 'other');
    await page.fill('#nbt-weight', '79');
    await page.fill('#nbt-bf', '17.5');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('79kg').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('17.5%').first()).toBeVisible({ timeout: 8000 });
  });
});
