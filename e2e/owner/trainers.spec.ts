import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Trainers', () => {
  test('trainer list shows trainer email', async ({ page }) => {
    await page.goto('/dashboard/owner/trainers');
    await expect(page.getByText('trainer@test.com')).toBeVisible();
  });

  test('expand Members shows member@test.com', async ({ page }) => {
    await page.goto('/dashboard/owner/trainers');
    await page.getByRole('button', { name: /members/i }).first().click();
    await expect(page.getByText('member@test.com')).toBeVisible();
  });
});
