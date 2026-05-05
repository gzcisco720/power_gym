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

  test('add 7-site body test for member', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);

    await page.selectOption('#protocol', '7site');
    await page.fill('#age', '30');
    await page.fill('#weight', '77');
    await page.fill('#chest', '20');
    await page.fill('#midaxillary', '15');
    await page.fill('#tricep', '12');
    await page.fill('#subscapular', '18');
    await page.fill('#abdominal', '25');
    await page.fill('#suprailiac', '14');
    await page.fill('#thigh', '16');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Weight 77 kg · Body Fat')).toBeVisible({ timeout: 8000 });
  });

  test('add 9-site body test for member', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);

    await page.selectOption('#protocol', '9site');
    await page.fill('#age', '30');
    await page.fill('#weight', '78');
    await page.fill('#tricep', '12');
    await page.fill('#chest', '20');
    await page.fill('#subscapular', '18');
    await page.fill('#abdominal', '25');
    await page.fill('#suprailiac', '14');
    await page.fill('#thigh', '16');
    await page.fill('#midaxillary', '15');
    await page.fill('#bicep', '10');
    await page.fill('#lumbar', '20');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Weight 78 kg · Body Fat')).toBeVisible({ timeout: 8000 });
  });

  test('add manual (other protocol) body test for member', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/body-tests/);

    // Default protocol is 'other' — no need to select
    await page.fill('#age', '30');
    await page.fill('#weight', '79');
    await page.fill('#bodyFatPct', '17.5');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Weight 79 kg · Body Fat 17.5%')).toBeVisible({ timeout: 8000 });
  });
});
