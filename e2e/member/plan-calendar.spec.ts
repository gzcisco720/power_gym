import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Plan Calendar', () => {
  test('calendar page renders with Training Calendar heading', async ({ page }) => {
    await page.goto('/member/plan/calendar');
    await expect(page.getByText('Training Calendar')).toBeVisible();
  });

  test('back link navigates to plan page', async ({ page }) => {
    await page.goto('/member/plan/calendar');
    await page.getByText('← Back to Plan').click();
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });

  test('seeded completed session is clickable and shows workout details', async ({ page }) => {
    await page.goto('/member/plan/calendar');
    // The seeded "Push" session was completed today — it renders as a button in the weekly grid
    await page.locator('button').filter({ hasText: 'Push' }).first().click();
    await page.waitForURL(/\/member\/plan\/session\//);
    await expect(page.getByText('Push')).toBeVisible();
    await expect(page.getByText('Bench Press')).toBeVisible();
  });
});
