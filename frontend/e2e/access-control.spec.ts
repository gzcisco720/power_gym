import { test, expect } from '@playwright/test';

test.describe('Access control — owner blocked from trainer/member routes', () => {
  test.use({ storageState: 'e2e/.auth/owner.json' });

  test('owner → /trainer/members → redirected away from /trainer/*', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.waitForURL((url) => !url.pathname.startsWith('/trainer'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/trainer/);
  });

  test('owner → /member → redirected away from /member/*', async ({ page }) => {
    await page.goto('/member');
    await page.waitForURL((url) => !url.pathname.startsWith('/member'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/member/);
  });
});

test.describe('Access control — trainer blocked from owner/member routes', () => {
  test.use({ storageState: 'e2e/.auth/trainer.json' });

  test('trainer → /owner → redirected away from /owner/*', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/owner/);
  });

  test('trainer → /member → redirected away from /member/*', async ({ page }) => {
    await page.goto('/member');
    await page.waitForURL((url) => !url.pathname.startsWith('/member'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/member/);
  });
});

test.describe('Access control — member blocked from owner/trainer routes', () => {
  test.use({ storageState: 'e2e/.auth/member.json' });

  test('member → /owner → redirected away from /owner/*', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/owner/);
  });

  test('member → /trainer/members → redirected away from /trainer/*', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.waitForURL((url) => !url.pathname.startsWith('/trainer'), { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/trainer/);
  });
});
