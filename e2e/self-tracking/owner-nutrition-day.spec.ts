import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

const SAVED_TEMPLATE_NAME = `My Diet — E2E ${Date.now()}`;
const TEST_DATE = new Date().toISOString().slice(0, 10); // today

test.describe('owner nutrition day + saveAsTemplate', () => {
  let createdNutritionTemplateId: string | null = null;

  test.beforeEach(async ({ request }) => {
    // Seed a one-meal log directly via API to skip the food picker UI
    const res = await request.put(`/api/me/nutrition-logs/${TEST_DATE}`, {
      data: {
        sourceTemplateId: null,
        sourceTemplateDayTypeName: null,
        dayLabel: 'Freestyle',
        dayCompleted: false,
        meals: [
          {
            name: 'Breakfast',
            order: 0,
            completed: false,
            items: [
              { foodName: 'Egg', quantityG: 100, kcal: 150, protein: 12, carbs: 1, fat: 10 },
            ],
          },
          { name: 'Lunch', order: 1, completed: false, items: [] },
          { name: 'Dinner', order: 2, completed: false, items: [] },
          { name: 'Snack', order: 3, completed: false, items: [] },
        ],
      },
    });
    expect(res.ok()).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    // Clean up the seeded log + saved template
    await request.delete(`/api/me/nutrition-logs/${TEST_DATE}`);
    if (createdNutritionTemplateId) {
      await request.delete(`/api/nutrition-templates/${createdNutritionTemplateId}`);
    }
  });

  test('owner saves nutrition day as template', async ({ page, request }) => {
    await page.goto('/owner/my-nutrition');

    // Verify the seeded Egg item shows up
    await expect(page.getByText('Egg').first()).toBeVisible();

    // Toggle the inline "Save as template" checkbox at the bottom
    await page.getByRole('checkbox', { name: /save as template/i }).check();

    // Fill the template name (aria-label="Template name")
    await page.getByLabel('Template name').fill(SAVED_TEMPLATE_NAME);

    // Click the Save as template button (the small one inside the inline section)
    await page.getByRole('button', { name: /^save as template$/i }).click();

    // Allow toast + network round-trip to settle
    await page.waitForTimeout(500);

    // Verify a NutritionTemplate was created server-side
    const listRes = await request.get('/api/nutrition-templates');
    expect(listRes.ok()).toBe(true);
    const list = (await listRes.json()) as Array<{ name: string; _id: string }>;
    const found = list.find((t) => t.name === SAVED_TEMPLATE_NAME);
    expect(found).toBeDefined();
    if (found) createdNutritionTemplateId = found._id;
  });

  test('owner can Mark day complete via confirm dialog and the button transitions to disabled', async ({ page }) => {
    await page.goto('/owner/my-nutrition');

    // Click Mark day complete — opens confirm dialog
    const markBtn = page.getByRole('button', { name: /^mark day complete$/i });
    await expect(markBtn).toBeVisible();
    await markBtn.click();

    // Dialog should appear with title
    await expect(page.getByRole('heading', { name: /mark today as complete/i })).toBeVisible();

    // Seeded state has 0 meals marked complete → state C: only "Mark all & submit" + Cancel
    await page.getByRole('button', { name: /mark all & submit/i }).click();

    // After PUT, the bar's button should swap to disabled "Day completed ✓"
    await expect(page.getByRole('button', { name: /^day completed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^day completed/i })).toBeDisabled();
  });
});
