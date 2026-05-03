import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToMemberHub(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  await page.getByText('Test Member').click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
}

test.describe('Trainer: Member Check-Ins Tab', () => {
  test('Check-ins tab is visible in member hub nav', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByRole('link', { name: 'Check-ins', exact: true })).toBeVisible();
  });

  test('Check-ins tab navigates to check-ins page', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);
    await expect(page.getByText('Weekly Check-In Schedule')).toBeVisible();
    await expect(page.getByText('Check-In History')).toBeVisible();
  });

  test('schedule form pre-fills with seeded config (Thursday, 07:00)', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);

    const daySelect = page.locator('select').first();
    const hourSelect = page.locator('select').nth(1);
    await expect(daySelect).toHaveValue('4');   // Thursday = 4
    await expect(hourSelect).toHaveValue('7');  // 07:00
  });

  test('trainer can save a new schedule and sees confirmation', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);

    await page.locator('select').first().selectOption('1');   // Monday
    await page.locator('select').nth(1).selectOption('9');    // 09:00
    await page.getByRole('button', { name: 'Save Schedule' }).click();

    await expect(page.getByText('Schedule saved.')).toBeVisible();
  });

  test('seeded past check-in appears in history list', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);

    await expect(page.getByText('Check-In History (1)')).toBeVisible();
    await expect(page.getByText('76.5 kg')).toBeVisible();
  });

  test('clicking a check-in navigates to detail page', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);

    await page.getByText('76.5 kg').click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins\/.+/);
    await expect(page.getByText('Check-In Detail')).toBeVisible();
  });

  test('check-in detail page shows seeded ratings and stats', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins$/);
    await page.getByText('76.5 kg').click();
    await page.waitForURL(/\/trainer\/members\/.+\/check-ins\/.+/);

    await expect(page.getByText('76.5 kg')).toBeVisible();
    await expect(page.getByText('7.5 hrs')).toBeVisible();
    await expect(page.getByText('Stuck to diet')).toBeVisible();
    await expect(page.getByText('Feeling strong this week')).toBeVisible();
  });
});
