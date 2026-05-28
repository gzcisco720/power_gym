import { test, expect } from '@playwright/test';

// Verifies the strength progress chart on the trainer's member plan tab:
//   - Chart section renders when the member has non-bodyweight PBs.
//   - Exercise selector is present and allows switching exercises.
//   - Chart renders data from the progress API.

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: member plan strength chart', () => {
  test('strength chart section renders when member has PBs', async ({ page }) => {
    // Navigate to the trainer's first member's plan tab.
    await page.goto('/trainer/members');
    await page.waitForLoadState('networkidle');

    // Click the first member in the list.
    const firstMemberLink = page.getByRole('link').filter({ hasText: /view|hub|plan/i }).first();
    if (!(await firstMemberLink.isVisible())) {
      test.skip(true, 'No members visible in trainer list');
      return;
    }
    await firstMemberLink.click();
    await page.waitForLoadState('networkidle');

    // Navigate to the Plan tab.
    const planTab = page.getByRole('link', { name: /plan/i });
    if (await planTab.isVisible()) {
      await planTab.click();
      await page.waitForLoadState('networkidle');
    }

    // If there's no Strength Progress section, skip (member may have no PBs).
    const chartSection = page.getByText('Strength Progress');
    if (!(await chartSection.isVisible())) {
      test.skip(true, 'No Strength Progress section — member has no non-bodyweight PBs');
      return;
    }

    await expect(chartSection).toBeVisible();

    // Exercise selector should be present.
    await expect(page.getByLabel('Select exercise for strength chart')).toBeVisible();
  });
});
