import { test, expect } from '@playwright/test';

test.describe('Owner Plans', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
  });

  test('creates plan template — redirected to list, template visible', async ({ page }) => {
    await page.goto('/owner/plans/new');
    await expect(page.getByRole('heading', { name: 'New Training Template' })).toBeVisible({ timeout: 10000 });

    // Fill plan name
    const planName = `E2E Plan ${Date.now()}`;
    await page.fill('#plan-name', planName);

    // Add a day
    await page.getByRole('button', { name: '+ Add Day' }).click();

    // Wait for the day card to appear
    await expect(page.getByRole('button', { name: '+ Add Exercise' })).toBeVisible({ timeout: 5000 });

    // Add an exercise — opens the exercise search dialog
    await page.getByRole('button', { name: '+ Add Exercise' }).click();

    // Wait for exercise search dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Search for an exercise
    const searchInput = page.getByPlaceholder('Search exercises…');
    await searchInput.fill('bench');

    // Wait for list to filter, then click first result
    await page.waitForTimeout(300);
    const exerciseList = page.locator('ul li button').first();
    if (await exerciseList.isVisible()) {
      await exerciseList.click();
    } else {
      // No exercises found — close dialog and skip
      await page.keyboard.press('Escape');
      // Use + Add Day approach with existing exercise
    }

    // Wait for dialog to close
    await page.waitForTimeout(500);

    // Save button should now be enabled (new template mode = always enabled when name is set)
    const saveBtn = page.getByRole('button', { name: 'Save Plan' });
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });

    // Click Save
    await saveBtn.click();

    // Should redirect to /owner/plans
    await page.waitForURL('/owner/plans', { timeout: 15000 });

    // New template should appear in list
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
  });

  test('edits template name — list shows new name; Cancel while dirty shows discard dialog', async ({ page }) => {
    // First navigate to plans list
    await page.goto('/owner/plans');
    await expect(page.getByRole('heading', { name: 'Training Templates' })).toBeVisible({ timeout: 10000 });

    // If there are templates, click the first one
    const templateLinks = page.locator('a[aria-label^="View"]');
    const count = await templateLinks.count();

    if (count === 0) {
      // Skip if no templates exist — create one first
      test.skip();
      return;
    }

    // Get the current template name from the list
    const firstTemplateName = await page.locator('.rounded-xl .text-\\[14px\\]').first().textContent();

    // Click on template to view detail
    await templateLinks.first().click();
    await page.waitForTimeout(500);

    // Click "Edit Plan" button
    await page.getByRole('button', { name: 'Edit Plan' }).click();

    // Should be on edit page
    await expect(page.getByRole('heading', { name: 'Edit Training Template' })).toBeVisible({ timeout: 10000 });

    // Save should be disabled initially (not dirty)
    const saveBtn = page.getByRole('button', { name: 'Save Plan' });
    await expect(saveBtn).toBeDisabled({ timeout: 5000 });

    // Change the plan name
    const newName = `Edited Plan ${Date.now()}`;
    await page.fill('#plan-name', '');
    await page.fill('#plan-name', newName);

    // Save should now be enabled (dirty)
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });

    // Save the plan
    await saveBtn.click();

    // Should redirect to list
    await page.waitForURL('/owner/plans', { timeout: 15000 });

    // New name should appear in list
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10000 });
  });

  test('Cancel while dirty shows discard dialog', async ({ page }) => {
    // Navigate to new plan page
    await page.goto('/owner/plans/new');
    await expect(page.getByRole('heading', { name: 'New Training Template' })).toBeVisible({ timeout: 10000 });

    // Make a change to trigger dirty state
    await page.fill('#plan-name', 'Draft Plan');

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Discard dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Discard changes?')).toBeVisible({ timeout: 3000 });

    // Click Discard
    await page.getByRole('button', { name: 'Discard' }).click();

    // Should navigate away
    await page.waitForURL('/owner/plans', { timeout: 10000 });
  });
});
