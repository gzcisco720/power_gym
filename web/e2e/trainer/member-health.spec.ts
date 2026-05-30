import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToHealthTab(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  // The member list has a "View Hub →" link for each member; click the first one (Test Member)
  await page.getByRole('link', { name: 'View Hub →' }).first().click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
  await page.getByRole('link', { name: 'Health', exact: true }).click();
  await page.waitForURL(/\/trainer\/members\/.+\/health/);
}

test.describe('Trainer: Member Health Tab', () => {
  test('Health tab shows Injuries, Medications, and Medical History sections', async ({ page }) => {
    await goToHealthTab(page);
    await expect(page.getByRole('heading', { name: 'Active Injuries' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Medications' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Medical History' })).toBeVisible();
  });

  test('seeded injury appears in Active Injuries section', async ({ page }) => {
    await goToHealthTab(page);
    await expect(page.getByText('Left knee strain')).toBeVisible();
  });

  test('seeded medication appears with beta blocker warning', async ({ page }) => {
    await goToHealthTab(page);
    await expect(page.getByText('Metoprolol 25mg')).toBeVisible();
    await expect(page.getByText(/Beta blocker/i)).toBeVisible();
  });

  test('Add injury via Sheet appears in Active Injuries list', async ({ page, request }) => {
    await goToHealthTab(page);

    await page.getByRole('button', { name: '+ Add' }).click();
    // Sheet opens — fill title using the input with the known placeholder
    await page.getByPlaceholder('e.g. Left knee ligament strain').fill('Shoulder impingement E2E');
    // force:true avoids the Next.js dev tools portal intercepting pointer events
    await page.getByRole('button', { name: 'Save' }).click({ force: true });

    await expect(page.getByText('Shoulder impingement E2E')).toBeVisible();

    // Cleanup: delete the injury we just created via API
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'View Hub →' }).first().click();
    await page.waitForURL(/\/trainer\/members\/([^/]+)$/);
    const memberId = page.url().split('/').pop()!;
    const res = await request.get(`/api/members/${memberId}/injuries`);
    const injuries = (await res.json()) as Array<{ _id: string; title: string }>;
    for (const inj of injuries) {
      if (inj.title === 'Shoulder impingement E2E') {
        await request.delete(`/api/members/${memberId}/injuries/${inj._id}`);
      }
    }
  });

  test('Resolve injury shows status change — E2E Resolve Injury moves to resolved', async ({ page }) => {
    await goToHealthTab(page);

    // The injury card <li> contains both the title text and the action buttons.
    // Use a list item locator filtered by the injury title text.
    const injuryCard = page.locator('li').filter({ hasText: 'E2E Resolve Injury' });
    await injuryCard.getByRole('button', { name: 'Mark resolved' }).click();

    // After resolution the button on that card becomes "Reactivate"
    await expect(injuryCard.getByRole('button', { name: 'Reactivate' })).toBeVisible();
  });
});
