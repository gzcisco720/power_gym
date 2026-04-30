import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToMemberHub(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  await page.getByText('Test Member').click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
}

test.describe('Trainer: Member Health Tab', () => {
  test('Health tab is visible in member hub nav', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByRole('link', { name: 'Health', exact: true })).toBeVisible();
  });

  test('Active section shows seeded injury', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);
    await expect(page.getByText('Left knee strain')).toBeVisible();
  });

  test('Add new injury appears in Active list', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);

    await page.getByRole('button', { name: '+ Add' }).click();
    await page.getByPlaceholder('e.g. Left knee ligament strain').fill('Shoulder impingement');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Shoulder impingement')).toBeVisible();
  });

  test('Resolve injury moves it to Resolved section', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/health/);

    const injuryRow = page.getByText('E2E Resolve Injury').locator('..').locator('..');
    await injuryRow.getByRole('button', { name: 'Resolve' }).click();

    const resolvedHeading = page.getByRole('heading', { name: 'Resolved', exact: true });
    const resolvedSection = resolvedHeading.locator('..');
    await expect(resolvedSection.getByText('E2E Resolve Injury')).toBeVisible();
  });
});
