import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Nutrition Templates', () => {
  test('template list shows E2E Nutrition Template', async ({ page }) => {
    await page.goto('/trainer/nutrition');
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();
  });

  test('create new nutrition template via new form', async ({ page }) => {
    await page.goto('/trainer/nutrition/new');

    // The form renders day types inline (no dialog flow).
    await page.fill('#tpl-name', 'Playwright Nutrition Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    await page.getByRole('button', { name: 'Save Plan' }).click();
    await page.waitForURL('/trainer/nutrition');

    await expect(page.getByText('Playwright Nutrition Plan')).toBeVisible();
  });

  test('add food via inline day-type opens FoodPicker dialog', async ({ page }) => {
    await page.goto('/trainer/nutrition/new');

    // Day types are inline cards; add one and a meal so + Add Food appears.
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');
    await page.getByRole('button', { name: '+ Add Meal' }).click();
    await page.getByPlaceholder('Meal name').fill('Breakfast');

    // + Add Food opens FoodPickerDialog (Dialog, not Sheet).
    await page.getByRole('button', { name: '+ Add Food' }).click();

    // FoodPicker dialog with All / My Food tabs and search input
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'My Food' })).toBeVisible();
    await expect(page.getByPlaceholder('Search foods...')).toBeVisible();
  });

  async function goToMemberNutrition(page: import('@playwright/test').Page) {
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'View Hub →' }).first().click();
    await page.waitForURL(/\/trainer\/members\/.+$/);
    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);
  }

  test('member nutrition page shows 3-section layout', async ({ page }) => {
    // Navigate to a member's nutrition page via the members list
    await goToMemberNutrition(page);

    // Sections: Current Plan (always), Schedule + History (when active plan + history exist)
    await expect(page.getByRole('heading', { name: 'Current Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  });

  test('member nutrition Current Plan section shows seeded plan', async ({ page }) => {
    await goToMemberNutrition(page);
    // Current Plan section shows the seeded active plan
    await expect(page.getByText('E2E Nutrition Template').first()).toBeVisible();
  });

  // ── Member nutrition tab: macro cards ────────────────────────────────────
  test('member nutrition Training Day macro card shows computed totals', async ({ page }) => {
    await goToMemberNutrition(page);

    // Seed: Rice 100g + Chicken 150g → 613 kcal, 54g protein, 79g carbs, 6g fat
    // Values now appear in both Current Plan card and Adherence Log — use .first()
    await expect(page.getByText('Training Day').first()).toBeVisible();
    await expect(page.getByText('613').first()).toBeVisible();
    await expect(page.getByText('54g').first()).toBeVisible();
    await expect(page.getByText('79g').first()).toBeVisible();
    await expect(page.getByText('6g').first()).toBeVisible();
  });

  test('member nutrition Weekly Schedule section shows day grid', async ({ page }) => {
    await goToMemberNutrition(page);
    await expect(page.getByText('Weekly Schedule')).toBeVisible();
    // Day abbreviations are always rendered in the 7-column schedule grid
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Sun')).toBeVisible();
  });

  test('Edit Schedule button opens Sheet with correct title', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: 'Edit Schedule' }).click();
    await expect(page.getByText('Edit Schedule').nth(1)).toBeVisible();
    // Sheet body warning is also shown
    await expect(page.getByText(/today.*locked/i)).toBeVisible();
  });

  // ── Adherence Log section ─────────────────────────────────────────────────
  test('member nutrition Adherence Log section shows today seeded log', async ({ page }) => {
    await goToMemberNutrition(page);
    await expect(page.getByText('Adherence Log (last 30 days)')).toBeVisible();
    // Seed: today's log — Training Day, Rice 100g + Chicken 150g
    await expect(page.getByText('Training Day').first()).toBeVisible();
    // Actual kcal from seed (613 kcal) appears in the adherence row
    await expect(page.getByText('613').first()).toBeVisible();
  });

  test('member nutrition Adherence Log shows actual vs target macros', async ({ page }) => {
    await goToMemberNutrition(page);
    // The adherence log row shows actual protein "54g" with target "/ 54g" inline
    // Scope to the adherence section to avoid matching the Current Plan card
    const adherenceSection = page.locator('section').filter({ hasText: 'Adherence Log (last 30 days)' });
    await expect(adherenceSection.getByText(/54g/).first()).toBeVisible();
    await expect(adherenceSection.getByText(/79g/).first()).toBeVisible();
  });

  test('assigning nutrition plan sends email to member', async ({ page }) => {
    const before = new Date();
    await goToMemberNutrition(page);

    // New flow: "Change Plan" → combobox → Open Editor → Continue → Save
    await page.getByRole('button', { name: 'Change Plan' }).click();

    // Combobox: click trigger, then search and pick template
    await page.getByRole('button', { name: /search templates/i }).click();
    await page.getByPlaceholder('Search templates...').fill('E2E');
    await page.getByRole('option', { name: 'E2E Nutrition Template' }).click();

    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new\?templateId=/);

    // Editor is pre-filled — just continue
    await page.getByRole('button', { name: /continue/i }).click();

    // Schedule sheet is open — save directly (schedule can be empty)
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();

    const email = await waitForEmailTo('member@test.com', {
      subject: /Nutrition Plan/,
      since: before,
    });
    expect(email.Subject).toBe('Your Nutrition Plan Has Been Updated — POWER GYM');
    expect(email.HTML).toContain('E2E Nutrition Template');
    expect(email.HTML).toContain('Test Trainer');
  });

  test('assign plan from scratch', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();

    // Leave combobox empty → scratch
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new$/);

    // Fill name + add day type
    await page.getByPlaceholder('Plan name').fill('Scratch Plan E2E');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    // Continue is now enabled
    await page.getByRole('button', { name: /continue/i }).click();

    // Schedule sheet is open — save directly
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.locator('section').filter({ hasText: 'Current Plan' }).getByText('Scratch Plan E2E')).toBeVisible();
  });

  test('assign plan from template with micro-edit', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /change plan/i }).click();

    // Select template via combobox
    await page.getByRole('button', { name: /search templates/i }).click();
    await page.getByPlaceholder('Search templates...').fill('E2E');
    await page.getByRole('option', { name: 'E2E Nutrition Template' }).click();
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new\?templateId=/);

    // Editor is pre-filled — edit the plan name
    await page.getByPlaceholder('Plan name').fill('Custom Bulk');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.locator('section').filter({ hasText: 'Current Plan' }).getByText('Custom Bulk')).toBeVisible();
  });

  test('save as template checkbox creates template in trainer list', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();
    // Leave combobox empty → scratch
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new$/);

    await page.getByPlaceholder('Plan name').fill('E2E SaveAsTemplate Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    // Check save-as-template
    await page.getByRole('checkbox', { name: /save as template/i }).check();
    await page.getByPlaceholder('Template name').fill('E2E Generated Template');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);

    // Verify template was created
    await page.goto('/trainer/nutrition');
    await expect(page.getByText('E2E Generated Template')).toBeVisible();
  });

  test('Continue button is disabled until name and day type are filled', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new/);

    await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();

    await page.getByPlaceholder('Plan name').fill('My Plan');
    await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();

    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await expect(page.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  test('Change Plan flow replaces active plan', async ({ page }) => {
    await goToMemberNutrition(page);

    // Verify active plan visible first
    await expect(page.locator('section').filter({ hasText: 'Current Plan' }).getByText('E2E Nutrition Template')).toBeVisible();

    await page.getByRole('button', { name: 'Change Plan' }).click();
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new$/);

    await page.getByPlaceholder('Plan name').fill('Replacement Plan E2E');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Rest Day');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.locator('section').filter({ hasText: 'Current Plan' }).getByText('Replacement Plan E2E')).toBeVisible();
  });
});
