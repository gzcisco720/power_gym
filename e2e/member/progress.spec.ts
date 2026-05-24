import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Progress', () => {
  test('heatmap is visible on the member dashboard', async ({ page }) => {
    await page.goto('/member');
    await expect(page.getByText('Training Frequency')).toBeVisible();
  });

  test('exercise dropdown shows Bench Press and chart renders on selection', async ({ page }) => {
    await page.goto('/member');
    await expect(page.getByText('Strength Progress')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await page.selectOption('select', { label: 'Bench Press' });
    // Scope to the Strength Progress card (contains the combobox) to avoid matching the body-chart container
    const strengthCard = page.locator('div.rounded-xl').filter({ has: page.getByRole('combobox') });
    await expect(strengthCard.locator('.recharts-responsive-container')).toBeVisible({ timeout: 8000 });
  });
});
