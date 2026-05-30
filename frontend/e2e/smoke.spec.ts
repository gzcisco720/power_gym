import { test, expect } from '@playwright/test';
import path from 'path';

// Only run once — this spec manages its own browser contexts
test.use({ storageState: { cookies: [], origins: [] } });

const authDir = path.join(process.cwd(), 'e2e', '.auth');

test.describe('auth storage state smoke', () => {
  test('owner storageState navigates to /owner without redirect to /login', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(authDir, 'owner.json'),
    });
    const page = await ctx.newPage();
    await page.goto('/owner');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/login');
    await ctx.close();
  });

  test('member storageState navigates to /member without redirect to /login', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(authDir, 'member.json'),
    });
    const page = await ctx.newPage();
    await page.goto('/member');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
    expect(page.url()).not.toContain('/login');
    await ctx.close();
  });
});
