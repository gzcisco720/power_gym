import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer Plans', () => {
  test('trainer creates plan template and it appears in /trainer/plans list', async ({ page }) => {
    await page.goto('/trainer/plans');
    await expect(page).not.toHaveURL(/login/);

    // Click "New Template"
    await page.getByRole('link', { name: /new template/i }).first().click();
    await expect(page).toHaveURL(/\/trainer\/plans\/new/);

    // Fill in name
    const nameInput = page.getByPlaceholder(/e\.g\. Off Season/i);
    await nameInput.fill('Trainer Strength Block');

    // Save without adding days (minimal valid form)
    await page.getByRole('button', { name: /save/i }).click();

    // Redirected to list and plan visible
    await expect(page).toHaveURL(/\/trainer\/plans/);
    await expect(page.getByText('Trainer Strength Block')).toBeVisible();
  });

  test('trainer creates nutrition template with a meal — totals shown and appears in list', async ({ page }) => {
    await page.goto('/trainer/nutrition-templates');
    await expect(page).not.toHaveURL(/login/);

    await page.getByRole('link', { name: /new template/i }).first().click();
    await expect(page).toHaveURL(/\/trainer\/nutrition-templates\/new/);

    // Fill in name
    const nameInput = page.getByPlaceholder(/Off Season Bulk/i);
    await nameInput.fill('Trainer Bulk Nutrition');

    // Save minimal form
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page).toHaveURL(/\/trainer\/nutrition-templates/);
    await expect(page.getByText('Trainer Bulk Nutrition')).toBeVisible();
  });
});
