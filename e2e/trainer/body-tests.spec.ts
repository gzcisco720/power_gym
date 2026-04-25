import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Body Tests', () => {
  test('add new body test for member', async ({ page }) => {
    await page.goto('/trainer/members');
    const bodyTestsLink = page.getByRole('link', { name: 'Body Tests →' });
    const href = await bodyTestsLink.getAttribute('href');
    await page.goto(href!);

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
