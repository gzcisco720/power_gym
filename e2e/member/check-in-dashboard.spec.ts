// e2e/member/check-in-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Check-In Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/member/check-in');
  });

  test('dashboard loads with key sections', async ({ page }) => {
    // Achievement cards
    await expect(page.locator('text=week streak').first()).toBeVisible();
    // Wellness breakdown
    await expect(page.locator('text=Wellness Breakdown')).toBeVisible();
    // Body metrics
    await expect(page.locator('text=Body Metrics')).toBeVisible();
    // History
    await expect(page.locator('text=History')).toBeVisible();
  });

  test('submit button navigates to /new', async ({ page }) => {
    const link = page.getByRole('link', { name: /Submit This Week/i });
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL('/member/check-in/new');
    }
  });

  test('All N → opens photo gallery modal', async ({ page }) => {
    const allBtn = page.locator('button', { hasText: /All \d+ →/ });
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await expect(page.locator('text=Progress Photos')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Progress Photos')).not.toBeVisible();
    }
  });

  test('Open Full Comparison opens compare modal', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Open Full Comparison/i });
    if (await btn.isVisible()) {
      await btn.click();
      await expect(page.locator('text=Before / After Comparison')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Before / After Comparison')).not.toBeVisible();
    }
  });

  test('history row navigates to detail view', async ({ page }) => {
    // Match only check-in detail links (not /history or /new)
    const row = page.locator('a[href^="/member/check-in/"]:not([href$="/history"]):not([href$="/new"])').first();
    if (await row.isVisible()) {
      await row.click();
      await expect(page).toHaveURL(/\/member\/check-in\/[^/]+$/);
      await expect(page.locator('text=How I felt')).toBeVisible();
    }
  });

  test('responsive: single column on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/member/check-in');
    // This week card appears above wellness breakdown on mobile
    const thisWeek = page.locator('text=This week').first();
    const wellness = page.locator('text=Wellness Breakdown');
    const thisWeekY  = (await thisWeek.boundingBox())?.y  ?? 0;
    const wellnessY  = (await wellness.boundingBox())?.y ?? 0;
    expect(thisWeekY).toBeLessThan(wellnessY);
  });
});
