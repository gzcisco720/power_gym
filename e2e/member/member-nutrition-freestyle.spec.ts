import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

const TODAY = new Date().toISOString().slice(0, 10);

test.describe('Member freestyle nutrition day view', () => {
  test('freestyle day view loads and shows meal sections', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await expect(
      page.getByText(/breakfast|lunch|dinner/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Mark day complete button opens confirm dialog', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Mark day complete' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/mark today as complete/i)).toBeVisible();
  });

  test('confirm dialog Cancel closes without submitting', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Mark day complete' }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // Day should NOT be completed — button remains active
    await expect(page.getByRole('button', { name: 'Mark day complete' })).toBeVisible();
  });
});
