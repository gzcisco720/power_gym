import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Equipment — list & basic CRUD', () => {
  test('list shows seeded equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
  });

  test('create new equipment appears in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();

    await page.getByPlaceholder('Search equipment type…').fill('E2E Treadmill');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Equipment' }).click();

    await expect(page.getByText('E2E Treadmill', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('delete equipment removes it from list', async ({ page }) => {
    await page.goto('/owner/equipment');

    const row = page.getByText('E2E Delete Equipment', { exact: true }).locator('..').locator('..').locator('..');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('E2E Delete Equipment', { exact: true })).not.toBeVisible();
  });

  test('status badge shows for tracked equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await expect(row).toBeVisible();
    await expect(row.getByText('maintenance', { exact: true })).toBeVisible();
  });

  test('can edit equipment details and see updated note in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Edit Equipment', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const noteInput = page.getByRole('dialog').getByPlaceholder('Location, condition, etc.');
    await noteInput.clear();
    await noteInput.fill('Updated E2E note');

    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Updated E2E note')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Owner: Equipment — condition tab', () => {
  test('edit dialog opens with Details tab active', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');
  });

  test('can update equipment status via Condition tab', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();

    await page.getByRole('tab', { name: 'Condition' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').locator('select').selectOption('active');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('dialog').getByText('active')).toBeVisible({ timeout: 5000 });
  });

  test('can add a condition report', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();

    await page.getByRole('tab', { name: 'Condition' }).click();
    await page.getByRole('button', { name: '+ Add Report' }).click();
    await page.getByPlaceholder('Describe the condition, issue, or action taken…').fill('Lubricated the belt');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Lubricated the belt')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Owner: Equipment — status filter tabs', () => {
  test('All tab is active by default and shows all items', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Track Machine', { exact: true })).toBeVisible();
  });

  test('Maintenance filter shows only maintenance items', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: 'Maintenance' }).click();

    await expect(page.getByText('E2E Filter Machine', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Barbell', { exact: true })).not.toBeVisible();
  });

  test('Active filter hides maintenance items', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: 'Active' }).click();

    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Filter Machine', { exact: true })).not.toBeVisible();
  });

  test('clicking All tab after filtering restores full list', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await expect(page.getByText('E2E Barbell', { exact: true })).not.toBeVisible();

    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Filter Machine', { exact: true })).toBeVisible();
  });

  test('empty state shown when no items match filter', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: 'Retired' }).click();
    await expect(page.getByText(/no equipment matches this filter/i)).toBeVisible();
  });
});

test.describe('Owner: Equipment — next service date', () => {
  test('service date input not visible in Add dialog when trackCondition is off', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(page.getByLabel(/next service/i)).not.toBeVisible();
  });

  test('service date input appears in Add dialog when trackCondition is enabled', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('dialog').getByRole('switch', { name: /track condition/i }).click();

    await expect(page.getByLabel(/next service/i)).toBeVisible();
  });

  test('service date input is visible in Edit dialog for tracked equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Edit', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(page.getByLabel(/next service/i)).toBeVisible();
  });

  test('setting a service date saves and shows Due label in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Edit', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/next service/i).fill('2099-08-20');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    await expect(row.getByText(/Due: Aug 20, 2099/)).toBeVisible({ timeout: 5000 });
  });

  test('service date persists after page refresh', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Edit', { exact: true }).locator('..').locator('..').locator('..');
    await expect(row.getByText(/Due: Aug 20, 2099/)).toBeVisible();

    await page.reload();
    const rowAfter = page.getByText('E2E Service Edit', { exact: true }).locator('..').locator('..').locator('..');
    await expect(rowAfter.getByText(/Due: Aug 20, 2099/)).toBeVisible({ timeout: 5000 });
  });

  test('future nextServiceDate shows Due label in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Due', { exact: true }).locator('..').locator('..').locator('..');
    await expect(row).toBeVisible();
    await expect(row.getByText(/Due: Jun 15, 2099/)).toBeVisible();
  });

  test('past nextServiceDate shows Overdue badge', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Overdue', { exact: true }).locator('..').locator('..').locator('..');
    await expect(row.getByText('Overdue', { exact: true })).toBeVisible();
  });

  test('past nextServiceDate shows Was due text', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText(/Was due: Jan 1, 2020/)).toBeVisible();
  });

  test('clearing service date removes Due label from that row', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Service Edit', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/next service/i).fill('');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    await expect(row.getByText(/^Due:/)).not.toBeVisible({ timeout: 5000 });
  });
});
