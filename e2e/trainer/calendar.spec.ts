import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

const nextWeekBtn = (page: import('@playwright/test').Page) =>
  page.locator('button').filter({ has: page.locator('[class*="lucide-chevron-right"]') });

test.describe('Trainer: Calendar', () => {
  test('page loads with navigation controls', async ({ page }) => {
    await page.goto('/trainer/calendar');
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(nextWeekBtn(page)).toBeVisible();
  });

  test('shows own sessions in next week', async ({ page }) => {
    await page.goto('/trainer/calendar');
    await nextWeekBtn(page).click();
    await expect(page.getByRole('button').filter({ hasText: '09:00–10:00' })).toBeVisible();
  });

  test('can create a session for own members only', async ({ page }) => {
    await page.goto('/trainer/calendar');
    await page.locator('div.cursor-pointer').first().click();
    await expect(page.getByRole('dialog').getByText('New Training Session')).toBeVisible();
    // Trainer sees own members only — no trainer dropdown
    await expect(page.getByRole('dialog').locator('select')).not.toBeVisible();
    // First member is pre-selected by the modal; clicking again would deselect them
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('#sessionDate').fill(tomorrow);
    await page.locator('#startTime').fill('08:00');
    await page.locator('#endTime').fill('09:00');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });
});
