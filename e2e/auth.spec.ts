import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('owner login redirects to /owner', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/owner');
    await expect(page).toHaveURL('/owner');
  });

  test('trainer login redirects to /trainer/members', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'trainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });

  test('member login redirects to /member/plan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member/plan');
    await expect(page).toHaveURL('/member/plan');
  });

  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/(owner|trainer|member)(\/|$)/);

    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@test.com');
    await page.fill('#password', 'WrongPassword!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('register via invite token creates trainer account', async ({ page }) => {
    await page.goto('/register?token=e2e-test-invite-token');
    await expect(page.getByText(/invited as a/i)).toBeVisible();

    await page.fill('#name', 'New Trainer');
    await page.fill('#email', 'newtrainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });
});
