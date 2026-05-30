import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToMemberHub(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  await page.getByRole('link', { name: 'View Hub →' }).first().click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
}

test.describe('Trainer: Members', () => {
  test('member list shows member email', async ({ page }) => {
    await page.goto('/trainer/members');
    await expect(page.getByText('member@test.com', { exact: true })).toBeVisible();
  });

  test('clicking member card navigates to hub page', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByText('Test Member').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });

  test('hub overview shows data cards with seeded data', async ({ page }) => {
    await goToMemberHub(page);

    // Stat strip: 4 cards — use exact:true to avoid matching chart legend labels
    await expect(page.getByText('Weight', { exact: true })).toBeVisible();
    await expect(page.getByText('Body Fat', { exact: true })).toBeVisible();
    await expect(page.getByText('Sessions', { exact: true })).toBeVisible();
    await expect(page.getByText('Last Session', { exact: true })).toBeVisible();
    // Plan card section
    await expect(page.getByText('Active Plan')).toBeVisible();
    await expect(page.getByText('E2E Test Plan')).toBeVisible();
  });

  test('Plan tab navigates to plan page', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    // Member has an active plan in seed; verify Current Plan section + plan name
    await expect(page.getByRole('heading', { name: 'Current Plan' })).toBeVisible();
    await expect(page.getByText('E2E Test Plan').first()).toBeVisible();
  });

  test('assign plan to member via hub', async ({ page }) => {
    await goToMemberHub(page);
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
    await goToMemberHub(page);
    await expect(page.getByRole('link', { name: 'Photos', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Photos', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/photos$/);
    // Seed has photos — photos grid should appear (not empty state)
    await expect(page.locator('img[src*="picsum.photos"]').first()).toBeVisible();
  });

  test('Nutrition tab shows assigned plan name', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Nutrition', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/nutrition/);
    await expect(page.getByRole('paragraph').filter({ hasText: 'E2E Nutrition Template' })).toBeVisible();
  });

  // ── Overview tab: stat strip deltas ──────────────────────────────────────
  test('hub overview shows weight delta from body test comparison', async ({ page }) => {
    await goToMemberHub(page);
    // ≥2 body tests exist → a ▲/▼ delta with "kg" suffix appears in the stat strip
    await expect(page.getByText(/[▲▼] \d+\.\d+ kg/)).toBeVisible();
  });

  test('hub overview shows BF delta from body test comparison', async ({ page }) => {
    await goToMemberHub(page);
    // ≥2 body tests exist → a ▲/▼ delta with "%" suffix appears in the stat strip
    await expect(page.getByText(/[▲▼] \d+\.\d+%/)).toBeVisible();
  });

  // ── Overview tab: health panel ────────────────────────────────────────────
  test('hub overview health panel shows seeded active injury', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByText('Left knee strain')).toBeVisible();
  });

  test('hub overview health panel shows seeded active medication', async ({ page }) => {
    await goToMemberHub(page);
    await expect(page.getByText('Metoprolol 25mg')).toBeVisible();
  });

  // ── Overview tab: body composition chart ─────────────────────────────────
  test('hub overview body composition chart renders with seeded data', async ({ page }) => {
    await goToMemberHub(page);
    // Recharts mounts a div.recharts-responsive-container when data is present
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
  });

  // ── Plan tab: Personal Bests ──────────────────────────────────────────────
  test('plan tab shows Personal Bests section with Bench Press', async ({ page }) => {
    await goToMemberHub(page);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    const pbSection = page.locator('section').filter({ hasText: 'Personal Bests' });
    await expect(pbSection).toBeVisible();
    await expect(pbSection.locator('p').filter({ hasText: /^Bench Press$/ })).toBeVisible();
    // PB value may change across test runs (other specs complete Bench Press sessions)
    await expect(pbSection.getByText(/est\. 1RM \d+\.\d+ kg/).first()).toBeVisible();
  });

  // ── Plan tab: Session History ─────────────────────────────────────────────
  test('plan tab Session History section renders when sessions exist', async ({ page, request }) => {
    // Get member ID from the list page
    await page.goto('/trainer/members');
    const hubLink = page.getByRole('link', { name: 'View Hub →' }).first();
    const href = await hubLink.getAttribute('href');
    const memberId = href!.split('/').pop()!;

    // Create a completed session so Session History section renders
    const planRes = await request.get(`/api/members/${memberId}/plan`);
    const plan = (await planRes.json()) as { _id: string };
    const sessionRes = await request.post('/api/sessions', {
      data: { memberId, memberPlanId: plan._id, dayNumber: 1 },
    });
    const session = (await sessionRes.json()) as { _id: string };

    await page.goto(href + '/plan');
    await page.waitForURL(/\/trainer\/members\/.+\/plan/);
    await expect(page.getByText('Session History')).toBeVisible();

    // Cleanup
    await request.delete(`/api/sessions/${session._id}`);
  });
});
