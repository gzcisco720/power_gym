import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

const nextWeekBtn = (page: import('@playwright/test').Page) =>
  page.locator('button').filter({ has: page.locator('[class*="lucide-chevron-right"]') });

test.describe('Owner: Calendar', () => {
  test('page loads with navigation controls', async ({ page }) => {
    await page.goto('/owner/calendar');
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(page.locator('button').filter({ has: page.locator('[class*="lucide-chevron-left"]') })).toBeVisible();
    await expect(nextWeekBtn(page)).toBeVisible();
  });

  test('shows seeded session card in next week', async ({ page }) => {
    await page.goto('/owner/calendar');
    await nextWeekBtn(page).click();
    await expect(page.getByRole('button').filter({ hasText: '09:00–10:00' })).toBeVisible();
  });

  test('clicking session card opens Edit Session modal', async ({ page }) => {
    await page.goto('/owner/calendar');
    await nextWeekBtn(page).click();
    await page.getByRole('button').filter({ hasText: '09:00–10:00' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edit Session')).toBeVisible();
    await page.getByRole('button', { name: /dismiss/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can cancel a session from the edit modal', async ({ page }) => {
    await page.goto('/owner/calendar');
    await nextWeekBtn(page).click();
    await page.getByRole('button').filter({ hasText: '14:00–15:00' }).click();
    await expect(page.getByText('Edit Session')).toBeVisible();
    await page.getByRole('button', { name: /cancel session/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: '14:00–15:00' })).not.toBeVisible();
  });

  test('can create a one-off session via slot click', async ({ page }) => {
    await page.goto('/owner/calendar');
    await page.locator('div.cursor-pointer').first().click();
    await expect(page.getByRole('dialog').getByText('New Training Session')).toBeVisible();
    await page.getByRole('dialog').locator('select').selectOption({ label: 'Test Trainer' });
    await page.getByRole('dialog').getByRole('button', { name: 'Test Member' }).click();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('#sessionDate').fill(tomorrow);
    await page.locator('#startTime').fill('11:00');
    await page.locator('#endTime').fill('12:00');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
