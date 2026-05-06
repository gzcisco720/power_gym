import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Nutrition Templates', () => {
  test('template list shows E2E Nutrition Template', async ({ page }) => {
    await page.goto('/trainer/nutrition');
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });

  test('create new nutrition template via new form', async ({ page }) => {
    await page.goto('/trainer/nutrition/new');

    // Fill template name using the new #tpl-name selector
    await page.fill('#tpl-name', 'Playwright Nutrition Plan');

    // Open the day type dialog using the new "+ Day Type" button
    await page.getByRole('button', { name: '+ Day Type' }).click();

    // The dialog should now be open — fill the Name field inside it
    await page.getByRole('dialog').getByLabel('Name').fill('Training Day');

    // Fill target kcal inside the dialog
    await page.getByRole('dialog').getByLabel('Target Kcal').fill('2200');

    // Save the day type via the "Save Day Type" button inside the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Save Day Type' }).click();

    // Submit the template form
    await page.getByRole('button', { name: 'Save Template' }).click();
    await page.waitForURL('/trainer/nutrition');

    await expect(page.getByText('Playwright Nutrition Plan')).toBeVisible();
  });

  test('member nutrition page shows 3-tab layout', async ({ page }) => {
    // Navigate to a member's nutrition page via the members list
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);

    // Verify the 3-tab layout is present
    await expect(page.getByRole('tab', { name: 'Current Plan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Schedule' })).toBeVisible();
  });

  test('member nutrition Current Plan tab shows seeded plan', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);

    // Current Plan tab is active by default and shows the seeded plan
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });
});
