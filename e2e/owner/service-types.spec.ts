import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Service Types', () => {
  test('services page is accessible from sidebar', async ({ page }) => {
    await page.goto('/owner');
    await page.getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL('/owner/services');
    await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible();
  });

  test('owner can create a service type', async ({ page }) => {
    await page.goto('/owner/services');
    await page.getByRole('button', { name: '+ Add Service' }).click();
    await page.getByLabel('Name').fill('E2E Test PT Session');
    await page.getByLabel('Duration (min)').fill('60');
    await page.getByLabel('Price per Session').fill('250');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('E2E Test PT Session')).toBeVisible();
    await expect(page.getByText('CNY 250')).toBeVisible();
  });

  test('created service type appears in services list', async ({ page }) => {
    // Ensure at least one service type exists
    await page.goto('/owner/services');
    const hasService = await page.getByText('E2E Test PT Session').isVisible().catch(() => false);
    if (!hasService) {
      await page.getByRole('button', { name: '+ Add Service' }).click();
      await page.getByLabel('Name').fill('E2E Test PT Session');
      await page.getByLabel('Duration (min)').fill('60');
      await page.getByLabel('Price per Session').fill('250');
      await page.getByRole('button', { name: 'Save' }).click();
    }

    await expect(page.getByText('E2E Test PT Session')).toBeVisible();
  });

  test('owner can deactivate a service type', async ({ page }) => {
    // Ensure a service type exists
    await page.goto('/owner/services');
    const hasService = await page.getByText('E2E Test PT Session').isVisible().catch(() => false);
    if (!hasService) {
      await page.getByRole('button', { name: '+ Add Service' }).click();
      await page.getByLabel('Name').fill('E2E Test PT Session');
      await page.getByLabel('Duration (min)').fill('60');
      await page.getByLabel('Price per Session').fill('250');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('E2E Test PT Session')).toBeVisible();
    }

    // Click to edit
    await page.getByText('E2E Test PT Session').click();
    await expect(page.getByRole('button', { name: 'Deactivate' })).toBeVisible();
    await page.getByRole('button', { name: 'Deactivate' }).click();

    // After deactivate, the service should move to inactive section
    await expect(page.getByText('Inactive')).toBeVisible();
  });
});
