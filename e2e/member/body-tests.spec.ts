import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Body Tests', () => {
  test('latest test card shows weight and body fat', async ({ page }) => {
    await page.goto('/dashboard/member/body-tests');
    await expect(page.getByText('75')).toBeVisible();
    await expect(page.getByText('18.0')).toBeVisible();
  });
});
