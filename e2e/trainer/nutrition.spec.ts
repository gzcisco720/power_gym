import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Nutrition Templates', () => {
  test('template list shows E2E Nutrition Template', async ({ page }) => {
    await page.goto('/trainer/nutrition');
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });

  test('create new nutrition template via new form', async ({ page }) => {
    await page.goto('/trainer/nutrition/new');

    // The form renders day types inline (no dialog flow).
    await page.fill('#tpl-name', 'Playwright Nutrition Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    await page.getByRole('button', { name: 'Save Plan' }).click();
    await page.waitForURL('/trainer/nutrition');

    await expect(page.getByText('Playwright Nutrition Plan')).toBeVisible();
  });

  test('add food via inline day-type opens FoodPicker dialog', async ({ page }) => {
    await page.goto('/trainer/nutrition/new');

    // Day types are inline cards; add one and a meal so + Add Food appears.
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');
    await page.getByRole('button', { name: '+ Add Meal' }).click();
    await page.getByPlaceholder('Meal name').fill('Breakfast');

    // + Add Food opens FoodPickerDialog (Dialog, not Sheet).
    await page.getByRole('button', { name: '+ Add Food' }).click();

    // FoodPicker dialog with All / My Food tabs and search input
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'My Food' })).toBeVisible();
    await expect(page.getByPlaceholder('Search foods...')).toBeVisible();
  });

  test('member nutrition page shows 3-section layout', async ({ page }) => {
    // Navigate to a member's nutrition page via the members list
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);

    // Sections: Current Plan (always), Schedule + History (when active plan + history exist)
    await expect(page.getByRole('heading', { name: 'Current Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  });

  test('member nutrition Current Plan section shows seeded plan', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);

    // Current Plan section shows the seeded active plan
    await expect(page.getByText('E2E Nutrition Template').first()).toBeVisible();
  });
});
