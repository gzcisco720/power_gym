import { test, expect } from '@playwright/test';

const OWNER = { email: 'owner@test.com', password: 'TestPass123!' };
const TRAINER = { email: 'trainer@test.com', password: 'TestPass123!' };
const MEMBER = { email: 'member@test.com', password: 'TestPass123!' };

async function login(page: import('@playwright/test').Page, creds: typeof OWNER) {
  await page.goto('/login');
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('Authentication', () => {
  test('owner login redirects to /owner and sidebar shows Members', async ({ page }) => {
    await login(page, OWNER);
    await page.waitForURL('/owner');
    await expect(page).toHaveURL('/owner');
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
  });

  test('trainer login redirects to /trainer/members and sidebar shows Plans', async ({ page }) => {
    await login(page, TRAINER);
    await page.waitForURL('/trainer/members');
    await expect(page).toHaveURL('/trainer/members');
    // Trainer sidebar shows Training Templates under TEMPLATES group
    await expect(page.getByRole('link', { name: 'Training Templates' })).toBeVisible();
  });

  test('member login redirects to /member and Check-In is visible', async ({ page }) => {
    await login(page, MEMBER);
    await page.waitForURL('/member');
    await expect(page).toHaveURL('/member');
    await expect(page.getByRole('link', { name: 'Check-In' }).first()).toBeVisible();
  });

  test('silent refresh on reload — stays on /owner without flash to /login', async ({ page }) => {
    await login(page, OWNER);
    await page.waitForURL('/owner');
    await page.reload();
    await page.waitForURL('/owner');
    await expect(page).toHaveURL('/owner');
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
  });

  test('logout redirects to /login and reload stays on /login', async ({ page }) => {
    await login(page, MEMBER);
    await page.waitForURL('/member');
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).first().click();
    await page.getByRole('button', { name: 'Sign out' }).last().click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    await page.reload();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated guard redirects /owner/members to /login', async ({ page }) => {
    await page.goto('/owner/members');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('wrong-role guard: member cannot access /owner', async ({ page }) => {
    await login(page, MEMBER);
    await page.waitForURL('/member');
    await page.goto('/owner');
    await expect(page).not.toHaveURL('/owner');
  });

  test('invalid password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', OWNER.email);
    await page.fill('#password', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('deep-link + reload: authenticated member stays on /member/check-in after reload', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/member-zauth.json', baseURL: 'http://localhost:5173' });
    const page = await ctx.newPage();

    await page.goto('/member/check-in');
    await page.waitForURL('/member/check-in', { timeout: 10000 });
    await page.reload();
    await page.waitForURL('/member/check-in', { timeout: 10000 });
    await expect(page).toHaveURL('/member/check-in');

    await ctx.close();
  });
});
