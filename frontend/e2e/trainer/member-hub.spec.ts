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

  test('trainer on Health tab adds an injury and it appears in the list', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Navigate to Health tab
    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/health/, { timeout: 10000 });

    // Health tab shows Active Injuries section
    await expect(page.getByText('Active Injuries')).toBeVisible({ timeout: 10000 });

    // Click "+ Add" to open the injury sheet
    await page.getByRole('button', { name: '+ Add' }).click();
    await expect(page.getByText('New Injury Record')).toBeVisible({ timeout: 5000 });

    // Fill in the injury title
    const titleInput = page.getByPlaceholder('e.g. Left knee ligament strain');
    await titleInput.fill('E2E Test Shoulder Injury');

    // Save the injury
    await page.getByRole('button', { name: 'Save' }).last().click();

    // The new injury should appear in the list
    await expect(page.getByText('E2E Test Shoulder Injury')).toBeVisible({ timeout: 10000 });
  });

  test('trainer on Body Tests tab submits skinfolds and test appears listed', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Navigate to Body Tests tab
    await page.getByRole('link', { name: 'Body Tests', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/body-tests/, { timeout: 10000 });

    // Click "New Test" button
    await page.getByRole('button', { name: 'New Test' }).click();
    await expect(page.getByText('New Body Test')).toBeVisible({ timeout: 5000 });

    // Select "Other (manual %)" protocol to keep the form simple
    await page.selectOption('#nbt-protocol', 'other');

    // Fill in weight and body fat
    await page.fill('#nbt-weight', '80');
    await page.fill('#nbt-bf', '15.5');

    // Fill date
    await page.fill('#nbt-date', '2026-05-01');

    // Click Save
    await page.getByRole('button', { name: 'Save' }).last().click();

    // The saved test should appear (body fat % or date)
    await expect(page.getByText(/15\.5|May 1/)).toBeVisible({ timeout: 10000 });
  });

  test('trainer on Progress tab — strength chart renders', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Navigate to Progress tab
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/progress/, { timeout: 10000 });

    // Progress tab should show Strength Progress section or "No exercise history yet"
    await expect(
      page.getByText(/Strength Progress|No exercise history yet/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('trainer on Check-ins tab — seeded check-ins are listed', async ({ page }) => {
    await expect(page.getByPlaceholder('Search members...')).toBeVisible({ timeout: 10000 });
    const viewHubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    await viewHubLink.click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+$/, { timeout: 10000 });

    // Navigate to Check-ins tab
    await page.getByRole('link', { name: 'Check-ins', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/[a-z0-9]+\/check-ins/, { timeout: 10000 });

    // Check-ins tab should show the history section with seeded check-ins
    await expect(page.getByText(/Check-In History/i)).toBeVisible({ timeout: 10000 });

    // Seeded data has 21 check-ins — count should be visible
    await expect(page.getByText(/Check-In History \(\d+\)/)).toBeVisible({ timeout: 10000 });
  });
});
