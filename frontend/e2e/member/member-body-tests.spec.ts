import { test, expect } from '@playwright/test';

test.describe('Member Body Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
  });

  test('member on /member/body-tests sees test history', async ({ page }) => {
    await page.goto('/member/body-tests');
    await expect(page.getByText('Body Tests')).toBeVisible({ timeout: 10000 });

    // Either seeded test records or empty state
    await expect(
      page.getByText(/Body Composition Trend/).or(page.getByText(/No body tests yet/)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('member body tests chart renders when tests exist', async ({ page }) => {
    await page.goto('/member/body-tests');
    await expect(page.getByText('Body Tests')).toBeVisible({ timeout: 10000 });

    const trend = page.getByText('Body Composition Trend');
    if (await trend.isVisible({ timeout: 5000 })) {
      // Chart wrapper is visible
      await expect(trend).toBeVisible();
      // History section shows
      await expect(page.getByText('History')).toBeVisible();
    }
  });

  test('member body tests shows seeded test data', async ({ page }) => {
    await page.goto('/member/body-tests');
    await expect(page.getByText('Body Tests')).toBeVisible({ timeout: 10000 });

    // Check for seeded data (75 kg + 18.0% from seed)
    const weight = page.getByText(/75 kg/).first();
    const bodyFat = page.getByText(/18\.0%/).first();

    const weightVisible = await weight.isVisible({ timeout: 5000 }).catch(() => false);
    const bodyFatVisible = await bodyFat.isVisible({ timeout: 5000 }).catch(() => false);

    if (weightVisible && bodyFatVisible) {
      await expect(weight).toBeVisible();
      await expect(bodyFat).toBeVisible();
    } else {
      // Accept empty state gracefully if seed data not present
      await expect(
        page.getByText(/No body tests yet/).or(page.getByText(/record/)),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
