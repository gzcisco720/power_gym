import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Personal Bests', () => {
  test('PB board shows Bench Press with estimated 1RM', async ({ page }) => {
    await page.goto('/dashboard/member/pbs');
    await expect(page.getByText('Bench Press')).toBeVisible();
    await expect(page.getByText(/est\. 1RM/)).toBeVisible();
  });
});
