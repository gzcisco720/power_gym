import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: My Foods', () => {
  test('list page loads with heading and Create Food link', async ({ page }) => {
    await page.goto('/trainer/foods');

    // PageHeader renders an <h1> with the title
    await expect(page.getByRole('heading', { name: 'My Foods' })).toBeVisible();

    // The "Create Food" link should be visible in the page header actions
    await expect(page.getByRole('link', { name: 'Create Food' })).toBeVisible();
  });

  test('list page shows filter input', async ({ page }) => {
    await page.goto('/trainer/foods');

    // A filter-by-name input is always rendered regardless of list state
    await expect(page.getByPlaceholder('Filter by name...')).toBeVisible();
  });

  test('create page loads with heading and required form fields', async ({ page }) => {
    await page.goto('/trainer/foods/new');

    // PageHeader renders an <h1>
    await expect(page.getByRole('heading', { name: 'Create Food' })).toBeVisible();

    // Name field — identified by placeholder
    await expect(page.getByPlaceholder('e.g. Chicken Breast')).toBeVisible();

    // Energy (kcal) field — the first number input in the core macros grid
    // All four macro inputs share placeholder "0"; at least one must be present
    await expect(page.getByPlaceholder('0').first()).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Create Food' })).toBeVisible();
  });

  test('create page navigates back to list on Cancel', async ({ page }) => {
    await page.goto('/trainer/foods/new');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL('/trainer/foods');

    await expect(page.getByRole('heading', { name: 'My Foods' })).toBeVisible();
  });
});
