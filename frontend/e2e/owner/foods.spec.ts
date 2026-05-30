import { test, expect } from '@playwright/test';

test.describe('Owner Foods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
  });

  test('owner creates a food — appears in list; deletes it — removed (toast)', async ({ page }) => {
    await page.goto('/owner/foods');
    await expect(page.getByRole('heading', { name: 'My Foods' })).toBeVisible({ timeout: 10000 });

    // Navigate to create food
    await page.getByRole('link', { name: /create food/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Food' })).toBeVisible({ timeout: 10000 });

    const foodName = `E2E Food ${Date.now()}`;

    // Fill in name
    await page.fill('#food-name', foodName);

    // Fill in macros
    await page.fill('#macro-kcal', '200');
    await page.fill('#macro-protein', '25');
    await page.fill('#macro-carbs', '10');
    await page.fill('#macro-fat', '5');

    // Fill in serving label (default serving row is pre-filled with "100 g")
    // The label field should already have "100 g" and grams "100"

    // Submit
    await page.getByRole('button', { name: 'Create Food' }).click();

    // Should redirect to /owner/foods
    await page.waitForURL('/owner/foods', { timeout: 15000 });

    // New food should appear
    await expect(page.getByText(foodName)).toBeVisible({ timeout: 10000 });

    // Delete the food — hover to reveal delete button
    const foodCard = page.locator('li').filter({ hasText: foodName });
    await foodCard.hover();
    await foodCard.getByRole('button', { name: /delete/i }).click();

    // Confirm delete in dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^delete$/i }).click();

    // Toast confirmation
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 10000 });

    // Food no longer visible
    await expect(page.getByText(foodName)).not.toBeVisible({ timeout: 5000 });
  });
});
