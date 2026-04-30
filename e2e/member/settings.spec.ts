import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Settings', () => {
  test('save phone — value persists after reload', async ({ page }) => {
    await page.goto('/member/settings');

    await page.fill('#phone', '0400000002');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled();

    await page.reload();

    await expect(page.locator('#phone')).toHaveValue('0400000002');
  });
});
