import { test, expect } from '@playwright/test';
import { waitForEmailTo } from './helpers/mailpit';

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

  test('member login redirects to /member', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member');
    await expect(page).toHaveURL('/member');
  });

  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'member@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/(owner|trainer|member)(\/|$)/);

    // Open user menu popover (bottom-left of sidebar)
    await page.getByRole('button', { name: 'User menu' }).click();
    // Click Sign out in popover
    await page.getByRole('button', { name: 'Sign out' }).first().click();
    // Confirmation dialog appears — click Sign out button in dialog
    await page.getByRole('button', { name: 'Sign out' }).last().click();
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

    await page.fill('#firstName', 'New');
    await page.fill('#lastName', 'Trainer');
    await page.fill('#email', 'newtrainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
  });

  test('forgot-password sends reset email to known user', async ({ page }) => {
    const before = new Date();
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'reset-test@test.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('If that email exists')).toBeVisible();

    const email = await waitForEmailTo('reset-test@test.com', { since: before });
    expect(email.Subject).toBe('Reset your POWER GYM password');
    expect(email.HTML).toContain('reset-password');
  });

  test('forgot-password reset link works end-to-end', async ({ page }) => {
    const before = new Date();
    // 1. Submit forgot-password for the dedicated reset-test user
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'reset-test@test.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    // 2. Get email and extract the reset URL from the HTML
    const email = await waitForEmailTo('reset-test@test.com', {
      subject: /Reset your POWER GYM password/,
      since: before,
    });
    const match = email.HTML.match(/href="(http:\/\/[^"]*reset-password[^"]*)"/);
    expect(match).not.toBeNull();
    const resetUrl = match![1];

    // 3. Navigate to the reset URL and set a new password
    await page.goto(resetUrl);
    await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible();
    await page.fill('input[type="password"]', 'NewPass456!');
    const confirmInput = page.locator('input[name="confirmPassword"], input[id="confirmPassword"]');
    if (await confirmInput.count() > 0) {
      await confirmInput.fill('NewPass456!');
    }
    await page.getByRole('button', { name: /reset|save|update/i }).click();

    // 4. Should redirect to login
    await page.waitForURL(/\/login/);

    // 5. Log in with the new password
    await page.fill('#email', 'reset-test@test.com');
    await page.fill('#password', 'NewPass456!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/member');
    await expect(page).toHaveURL('/member');
  });
});
