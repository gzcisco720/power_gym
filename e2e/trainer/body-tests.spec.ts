import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Body Tests', () => {
  test('existing seeded body tests are visible on page load', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);
    await expect(page.getByText('Weight 75 kg · Body Fat 18.0%')).toBeVisible();
  });

  test('add new body test for member', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);

    await page.selectOption('#protocol', '3site');

    await page.fill('#age', '30');
    await page.fill('#weight', '76');
    await page.fill('#chest', '21');
    await page.fill('#abdominal', '26');
    await page.fill('#thigh', '16');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Weight 76 kg · Body Fat')).toBeVisible({ timeout: 8000 });
  });
});
