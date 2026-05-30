import { test, expect } from '@playwright/test';

test.describe('Access Control: unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/owner redirects to /login', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });

  test('/trainer/members redirects to /login', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });

  test('/member redirects to /login', async ({ page }) => {
    await page.goto('/member');
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Access Control: member blocked from owner routes', () => {
  test.use({ storageState: 'e2e/.auth/member.json' });

  test('/owner redirects member away from owner area', async ({ page }) => {
    await page.goto('/owner');
    // Member is authenticated but lacks owner role — redirected away from /owner
    await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 10000 });
    expect(page.url()).not.toContain('/owner');
  });
});

test.describe('Access Control: trainer blocked from owner routes', () => {
  test.use({ storageState: 'e2e/.auth/trainer.json' });

  test('/owner/trainers redirects trainer away from owner area', async ({ page }) => {
    await page.goto('/owner/trainers');
    // Trainer is authenticated but lacks owner role — redirected away from /owner
    await page.waitForURL((url) => !url.pathname.startsWith('/owner'), { timeout: 10000 });
    expect(page.url()).not.toContain('/owner');
  });
});
