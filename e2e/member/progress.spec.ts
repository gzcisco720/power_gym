import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Progress', () => {
  test('heatmap is visible on the progress page', async ({ page }) => {
    await page.goto('/member/progress');
    await expect(page.getByRole('heading', { name: 'My Progress' })).toBeVisible();
    await expect(page.getByText('Training Frequency')).toBeVisible();
  });

  test('exercise dropdown shows Bench Press and chart renders on selection', async ({ page }) => {
    await page.goto('/member/progress');
    await expect(page.getByText('Strength Progress')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await page.selectOption('select', { label: 'Bench Press' });
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();
  });
});
