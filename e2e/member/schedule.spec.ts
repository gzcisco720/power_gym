import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Schedule', () => {
  test('shows upcoming session with trainer name', async ({ page }) => {
    await page.goto('/member/schedule');
    await expect(page.getByText(/09:00–10:00/)).toBeVisible();
    await expect(page.getByText('Test Trainer').first()).toBeVisible();
  });

  test('history section expands to reveal past sessions', async ({ page }) => {
    await page.goto('/member/schedule');
    await page.getByRole('button', { name: /show history/i }).click();
    await expect(page.getByText(/10:00–11:00/)).toBeVisible();
  });
});
