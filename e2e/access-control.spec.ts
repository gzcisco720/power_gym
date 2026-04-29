import { test, expect } from '@playwright/test';

test.describe('Access Control: unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/owner redirects to /login', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('/trainer/members redirects to /login', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('/member/plan redirects to /login', async ({ page }) => {
    await page.goto('/member/plan');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Access Control: member blocked from trainer and owner routes', () => {
  test.use({ storageState: 'e2e/.auth/member.json' });

  test('/trainer/members redirects member to /member/plan', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });

  test('/owner redirects member to /member/plan', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });

  test('/owner/trainers redirects member to /member/plan', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });
});

test.describe('Access Control: trainer blocked from owner routes', () => {
  test.use({ storageState: 'e2e/.auth/trainer.json' });

  test('/owner redirects trainer to /trainer/members', async ({ page }) => {
    await page.goto('/owner');
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });

  test('/owner/invites redirects trainer to /trainer/members', async ({ page }) => {
    await page.goto('/owner/invites');
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });

  test('/owner/trainers redirects trainer to /trainer/members', async ({ page }) => {
    await page.goto('/owner/trainers');
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });
});

test.describe('Access Control: owner can access all areas', () => {
  test.use({ storageState: 'e2e/.auth/owner.json' });

  test('owner can access /trainer/members', async ({ page }) => {
    await page.goto('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });

  test('owner can access /owner/trainers', async ({ page }) => {
    await page.goto('/owner/trainers');
    await expect(page).toHaveURL('/owner/trainers');
  });
});
