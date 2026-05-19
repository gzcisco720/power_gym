import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

const TODAY = new Date().toISOString().slice(0, 10);

test.describe('Member My Nutrition landing', () => {
  test('landing page renders with My Plan and Freestyle cards', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByRole('heading', { name: 'My Nutrition' })).toBeVisible();
    // Card labels are uppercased via CSS; use case-insensitive regex
    await expect(page.getByText(/my plan/i).first()).toBeVisible();
    await expect(page.getByText(/freestyle/i).first()).toBeVisible();
  });

  test('Freestyle Log Today navigates to day view in free mode', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.getByRole('button', { name: /log today/i }).click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=free/);
  });

  test('calendar icon opens calendar popover', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.getByRole('button', { name: /open calendar/i }).click();
    // base-ui Popover uses data-slot="popover-positioner"
    await expect(page.locator('[data-slot="popover-positioner"]')).toBeVisible();
  });

  test('day view loads in plan mode without errors', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=plan`);
    await expect(page.locator('body')).not.toContainText('Error');
    // Either shows the empty state or the "Mark day complete" button
    const markComplete = page.getByRole('button', { name: 'Mark day complete' });
    const emptyState = page.getByText("hasn't scheduled today");
    await expect(markComplete.or(emptyState)).toBeVisible({ timeout: 8000 });
  });
});
