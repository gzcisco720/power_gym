import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Body Tests', () => {
  test('latest test card shows weight and body fat', async ({ page }) => {
    await page.goto('/member/body-tests');
    await expect(page.getByText('75 kg').first()).toBeVisible();
    await expect(page.getByText('18.0%').first()).toBeVisible();
  });

  test('history section appears and shows older test entry', async ({ page }) => {
    await page.goto('/member/body-tests');
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('73 kg').first()).toBeVisible();
  });
});
