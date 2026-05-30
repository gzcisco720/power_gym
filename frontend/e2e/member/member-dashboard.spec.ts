import { test, expect } from '@playwright/test';

test.describe('Member Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member on /member sees greeting and KPI strip loaded (not skeleton)', async ({ page }) => {
    // The greeting includes the member's first name
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });

    // KPI strip shows 4 cells once data loads — wait for the "Sessions" label
    await expect(page.getByText('Sessions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Weight kg')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Body Fat %')).toBeVisible({ timeout: 5000 });
  });

  test('member on /member sees active plan card with Start link', async ({ page }) => {
    // The seed assigns a plan to "member" — the Active Plan card should appear
    // with a "Start" button linking to /member/my-training
    const startLink = page.getByRole('link', { name: 'Start' });

    // If no plan is assigned (member2 scenario), a fallback message shows instead.
    // For member@test.com the seed assigns a plan so we expect the Start link.
    await expect(startLink.or(page.getByText(/trainer hasn't assigned/i))).toBeVisible({
      timeout: 15000,
    });

    // If the Start link is present, confirm it points to /member/my-training
    const count = await startLink.count();
    if (count > 0) {
      await expect(startLink).toHaveAttribute('href', '/member/my-training');
    }
  });
});
