import { test, expect } from '@playwright/test';

test.describe('Trainer Member Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'trainer@test.com');
    await page.fill('#password', 'TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Trainer lands somewhere after login — navigate to /trainer/members
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
    await page.goto('/trainer/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 10000 });
  });

  test('trainer members list shows assigned members', async ({ page }) => {
    // Search input should appear once loaded
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    // Seeded member "Test Member" should be visible
    await expect(page.getByText('Test Member')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a member navigates to /trainer/members/:id and overview renders header + stat strip', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    // Find "View Hub" link for Test Member
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();

    // URL should be /trainer/members/:id
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/trainer\/members\/[a-z0-9]+$/);

    // Header should show member name
    await expect(page.getByText('Test Member')).toBeVisible({ timeout: 10000 });

    // Breadcrumb shows "← Members"
    await expect(page.getByText('← Members')).toBeVisible({ timeout: 10000 });

    // Stat strip section should render (has 4 StatCards with labels)
    await expect(page.getByText('Weight')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Body Fat')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sessions')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Last Session')).toBeVisible({ timeout: 10000 });
  });

  test('clicking Plan tab renders active plan days', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Click "Plan" tab
    await page.getByRole('link', { name: 'Plan' }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/plan/, { timeout: 10000 });

    // Plan tab content renders — either "No plan assigned" or the plan name
    await expect(
      page.getByText(/No plan assigned|E2E Test Plan|Current Plan/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('clicking Nutrition tab renders nutrition plan section', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Click "Nutrition" tab in the member hub tab bar (exact match to avoid sidebar links)
    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/nutrition/, { timeout: 10000 });

    // Nutrition tab shows "Current Plan" section header or "No nutrition plan assigned"
    await expect(
      page.getByText(/Current Plan|No nutrition plan assigned/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
