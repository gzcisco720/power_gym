import { test, expect } from '@playwright/test';

// Members are not allowed to use self-tracking endpoints (owner/trainer only).
// Storage state set up by global-setup.ts via e2e/.auth/member.json.
test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('member has no self-tracking access', () => {
  test('API returns 403 for /api/me/workout-logs', async ({ request }) => {
    const res = await request.get('/api/me/workout-logs?year=2026&month=5');
    expect(res.status()).toBe(403);
  });

  test('sidebar does not show My Training / My Nutrition for member', async ({ page }) => {
    await page.goto('/member/plan');
    // Wait for the nav sidebar to render
    await expect(page.getByText('My Plan')).toBeVisible();

    await expect(page.getByRole('link', { name: 'My Training' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'My Nutrition' })).toHaveCount(0);
  });
});
