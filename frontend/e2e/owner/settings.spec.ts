import { test, expect } from '@playwright/test';

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#email', 'owner@test.com');
  await page.fill('#password', 'TestPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/owner', { timeout: 15000 });
}

test.describe('Owner Settings', () => {
  test('edits gym name, saves → reload shows persisted value', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/settings?tab=gym-info');

    // Wait for the settings page to load
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });

    // Click Gym Info tab if not already active
    await page.getByRole('button', { name: 'Gym Info' }).click();

    // Wait for the form to appear
    await expect(page.locator('#gym-name')).toBeVisible({ timeout: 5000 });

    // Set a unique gym name
    const gymName = `E2E Gym ${Date.now()}`;
    await page.locator('#gym-name').fill(gymName);

    // Save button should be enabled (form is dirty)
    const saveBtn = page.getByRole('button', { name: 'Save Gym Info' });
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });
    await saveBtn.click();

    // Expect success toast
    await expect(page.getByText('Gym info saved')).toBeVisible({ timeout: 10000 });

    // Reload and verify persisted
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Gym Info' }).click();
    await expect(page.locator('#gym-name')).toHaveValue(gymName, { timeout: 10000 });
  });
});

test.describe('Owner Services', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/services');
    await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible({ timeout: 10000 });
  });

  test('adds a service type → appears in list', async ({ page }) => {
    // Click Add Service
    await page.getByRole('button', { name: 'Add Service' }).first().click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill in service type details
    const serviceName = `E2E Service ${Date.now()}`;
    await page.locator('#stName').fill(serviceName);
    await page.locator('#stDur').fill('45');
    await page.locator('#stPrice').fill('200');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for dialog to close and service to appear in the list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Owner Calendar', () => {
  test('sees a seeded scheduled session rendered', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/calendar');

    // Wait for the calendar page to load
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible({ timeout: 10000 });

    // Click Next week to navigate to next week where seeded sessions live
    await page.getByRole('button', { name: /next/i }).first().click();

    // After navigating, there should be at least one session event rendered
    // Sessions are rendered as buttons on the calendar grid
    // The seed has sessions for "next Monday" (nextMon date)
    // We look for session event cards rendered in the grid
    await expect(
      page.locator('button[style*="background-color"]').first()
    ).toBeVisible({ timeout: 15000 });
  });
});
