import { test, expect } from '@playwright/test';

// No stored auth state — all tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('owner login redirects to /owner', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner', { timeout: 15000 });
    await expect(page).toHaveURL('/owner');
  });

  test('trainer login redirects to /trainer/members', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'trainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/trainer/members', { timeout: 15000 });
    await expect(page).toHaveURL('/trainer/members');
  });

  test('member login redirects to /member', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member', { timeout: 15000 });
    await expect(page).toHaveURL('/member');
  });

  test('wrong password shows error message and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'WrongPassword!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
