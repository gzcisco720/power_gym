import { test, expect } from '@playwright/test';

test.describe('Member Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member on /member/journey sees timeline or empty state', async ({ page }) => {
    await page.goto('/member/journey');

    // Either sees a timeline (if body tests seeded) or the empty state
    const timelineOrEmpty = page.locator('text=My Journey').or(
      page.locator('text=No body tests recorded yet'),
    );
    await expect(timelineOrEmpty).toBeVisible({ timeout: 15000 });
  });
});
