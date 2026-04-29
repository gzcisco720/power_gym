import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Nutrition Plan', () => {
  test('shows Training Day tab and macro targets', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByRole('tab', { name: 'Training Day' })).toBeVisible();
    await expect(page.getByText('2500')).toBeVisible();
    await expect(page.getByText('180')).toBeVisible();
    await expect(page.getByText('280')).toBeVisible();
    await expect(page.getByText('70')).toBeVisible();
  });

  test('shows Lunch meal with seeded food items', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByText('Rice')).toBeVisible();
    await expect(page.getByText('Chicken Breast')).toBeVisible();
  });
});
