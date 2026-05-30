import { test, expect } from '@playwright/test';

// Members can access self-tracking endpoints (all roles are permitted).
// Storage state set up by global-setup.ts via e2e/.auth/member.json.
test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('member self-tracking access', () => {
  test('API returns 200 for /api/me/workout-logs', async ({ request }) => {
    const res = await request.get('/api/me/workout-logs?year=2026&month=5');
    expect(res.status()).toBe(200);
  });

  test('sidebar shows My Training and My Nutrition for member', async ({ page }) => {
    await page.goto('/member');
    // Wait for the nav sidebar to render
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'My Training' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'My Nutrition' })).toHaveCount(1);
  });
});
