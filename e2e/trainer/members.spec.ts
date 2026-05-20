import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Members', () => {
  test('member list shows member email', async ({ page }) => {
    await page.goto('/trainer/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('clicking member card navigates to hub page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await expect(page.getByText('Test Member').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub overview shows data cards with seeded data', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);

    // Stat strip: 4 cards
    await expect(page.getByText('Weight')).toBeVisible();
    await expect(page.getByText('Body Fat')).toBeVisible();
    await expect(page.getByText('Sessions')).toBeVisible();
    await expect(page.getByText('Last Session')).toBeVisible();
    // Seeded body test: weight 75kg
    await expect(page.getByText('75')).toBeVisible();
    // Plan card section
    await expect(page.getByText('Active Plan')).toBeVisible();
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('Plan tab navigates to plan page', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    // Member has an active plan in seed; verify Current Plan section + plan name
    await expect(page.getByRole('heading', { name: 'Current Plan' })).toBeVisible();
    await expect(page.getByText('E2E Test Plan').first()).toBeVisible();
  });

  test('assign plan to member via hub', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);

    // With an active plan, the trigger reads "Change Plan"; opens the assign Dialog.
    await page.getByRole('button', { name: 'Change Plan' }).click();
    await expect(page.getByLabel('Select plan template')).toBeVisible();

    await page.getByLabel('Select plan template').selectOption({ label: 'E2E Test Plan' });
    await page.getByRole('button', { name: 'Assign', exact: true }).click();

    await expect(page.getByText('E2E Test Plan').first()).toBeVisible();

    // Verify plan assigned email
    const email = await waitForEmailTo('member@test.com', {
      subject: /Training Plan/,
    });
    expect(email.Subject).toBe('Your Training Plan Has Been Updated — POWER GYM');
    expect(email.HTML).toContain('E2E Test Plan');
    expect(email.HTML).toContain('Test Trainer');
  });

  test('Photos tab is visible and navigates correctly', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await expect(page.getByRole('link', { name: 'Photos', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Photos', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/photos$/);
    // No photos in seed — empty state should appear
    await expect(page.getByText(/No photos submitted/i)).toBeVisible();
  });

  test('Nutrition tab shows assigned plan name', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);
    await expect(page.getByRole('paragraph').filter({ hasText: 'E2E Nutrition Template' })).toBeVisible();
  });
});
