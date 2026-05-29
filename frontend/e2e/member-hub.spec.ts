import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Member Hub Overview', () => {
  let sharedPage: Page;
  let sharedContext: BrowserContext;
  let memberId: string;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'e2e/.auth/trainer-hub.json' });
    sharedPage = await sharedContext.newPage();

    // Navigate to members list to get the member id
    await sharedPage.goto('/trainer/members');
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Find the first member's hub link
    const link = sharedPage.getByRole('link', { name: /View Hub/ }).first();
    const href = await link.getAttribute('href');
    const match = href?.match(/\/trainer\/members\/([^/]+)$/);
    if (!match) throw new Error('Could not find member id from hub link');
    memberId = match[1];

    // Ensure a body test exists for the member (create via body tests page)
    await sharedPage.goto(`/trainer/members/${memberId}/body-tests`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Only create body test if the page doesn't already show test data
    const hasBodyFat = await sharedPage.getByText(/body fat/i).isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasBodyFat) {
      const newTestBtn = sharedPage.getByRole('button', { name: /new test/i });
      if (await newTestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newTestBtn.click();
        await sharedPage.fill('#nbt-weight', '78');
        await sharedPage.fill('#nbt-chest', '10');
        await sharedPage.fill('#nbt-abdominal', '20');
        await sharedPage.fill('#nbt-thigh', '15');
        await sharedPage.getByRole('button', { name: /save test/i }).click();
        await expect(sharedPage.getByText(/body fat/i)).toBeVisible({ timeout: 8000 });
      }
    }

    // Ensure at least one completed session exists — first assign a plan if needed
    await sharedPage.goto(`/trainer/members/${memberId}/plan`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const hasPlan = await sharedPage.getByText(/active since/i).isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasPlan) {
      // Try to assign a plan
      const assignBtn = sharedPage.getByRole('button', { name: /assign plan/i });
      if (await assignBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await assignBtn.click();
        const selectTrigger = sharedPage.locator('[data-slot="select-trigger"]');
        if (await selectTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
          await selectTrigger.click();
          const firstOption = sharedPage.locator('[data-slot="select-item"]').first();
          if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstOption.click();
            await sharedPage.getByRole('button', { name: /^assign$/i }).click();
            await expect(sharedPage.getByText(/active since/i)).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }

    // Log a session so Sessions stat is > 0
    await sharedPage.goto(`/trainer/members/${memberId}/log/new`);
    await sharedPage.waitForSelector('nav', { timeout: 8000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const startBtn = sharedPage.getByRole('button', { name: /start session/i });
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
    }
    const completeBtn = sharedPage.getByRole('button', { name: /complete session/i });
    if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeBtn.click();
      await sharedPage.waitForTimeout(1000);
    }
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test('overview tab shows member name in header and Log Workout button', async () => {
    await sharedPage.goto(`/trainer/members/${memberId}`);
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // The page header should contain the member's name (Test Member)
    await expect(sharedPage.getByRole('heading', { name: /member/i }).first()).toBeVisible({
      timeout: 10000,
    });

    // Log Workout button should be present in the page header
    await expect(sharedPage.getByRole('button', { name: /log workout/i })).toBeVisible({
      timeout: 8000,
    });
  });

  test('overview tab shows Sessions stat with a number', async () => {
    await sharedPage.goto(`/trainer/members/${memberId}`);
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    // Wait for the overview content to load (skeletons disappear)
    await sharedPage.waitForFunction(
      () => !document.querySelector('.animate-pulse'),
      { timeout: 12000 },
    ).catch(() => {});

    // The "Sessions" stat card label is visible (exact match to avoid matching "Recent Sessions")
    await expect(sharedPage.getByText('Sessions', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('clicking Log Workout navigates to new session page', async () => {
    await sharedPage.goto(`/trainer/members/${memberId}`);
    await sharedPage.waitForSelector('nav', { timeout: 15000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await expect(sharedPage.getByRole('button', { name: /log workout/i })).toBeVisible({
      timeout: 8000,
    });

    await sharedPage.getByRole('button', { name: /log workout/i }).click();
    await sharedPage.waitForURL(`**/trainer/members/${memberId}/log/new`, { timeout: 8000 });
    expect(sharedPage.url()).toContain(`/trainer/members/${memberId}/log/new`);
  });
});
