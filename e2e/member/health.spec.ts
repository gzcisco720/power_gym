import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

// Get the member's own ID via NextAuth session endpoint
async function getMemberId(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.get('/api/auth/session');
  const data = (await res.json()) as { user?: { id?: string } };
  return data.user!.id!;
}

test.describe('Member: My Health page', () => {
  test('My Health appears in sidebar navigation', async ({ page }) => {
    await page.goto('/member');
    await expect(page.getByRole('link', { name: 'My Health' })).toBeVisible();
  });

  test('Health page shows all 3 sections', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByRole('heading', { name: 'Injuries' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Medications' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Medical Background' })).toBeVisible();
  });

  test('seeded injury visible to member', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByText('Left knee strain')).toBeVisible();
  });

  test('seeded medication visible to member with duration badge', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByText('Metoprolol 25mg')).toBeVisible();
    await expect(page.getByText('Long-term').first()).toBeVisible();
  });

  test('member adds a new injury via Sheet — golden path', async ({ page, request }) => {
    await page.goto('/member/health');
    await page.getByRole('button', { name: '+ Report Injury' }).click();
    // Sheet opens — fill title
    await page.getByPlaceholder('e.g. Left knee ligament strain').fill('Right ankle sprain E2E');
    await page.getByRole('button', { name: 'Report Injury' }).click();
    await expect(page.getByText('Right ankle sprain E2E')).toBeVisible();

    // Cleanup
    const memberId = await getMemberId(request);
    const res = await request.get(`/api/members/${memberId}/injuries`);
    const injuries = (await res.json()) as Array<{ _id: string; title: string }>;
    for (const inj of injuries) {
      if (inj.title === 'Right ankle sprain E2E') {
        await request.delete(`/api/members/${memberId}/injuries/${inj._id}`);
      }
    }
  });

  test('member resolves an injury via confirm dialog', async ({ page, request }) => {
    // Create a fresh injury to avoid touching shared seed data
    const memberId = await getMemberId(request);
    const createRes = await request.post(`/api/members/${memberId}/injuries`, {
      data: { title: 'E2E Resolve Member Injury' },
    });
    const created = (await createRes.json()) as { _id: string };

    await page.goto('/member/health');
    await expect(page.getByText('E2E Resolve Member Injury')).toBeVisible();

    const injuryCard = page.locator('li').filter({ hasText: 'E2E Resolve Member Injury' });
    await injuryCard.getByRole('button', { name: 'Mark as resolved' }).click();

    // Confirm dialog appears
    await expect(page.getByRole('heading', { name: 'Mark as resolved?' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark Resolved' }).click();

    // Injury moves to history — the button toggles to show resolved state
    // The resolved count toggles should now appear
    await expect(page.getByText(/History · \d+ resolved/i)).toBeVisible();

    // Cleanup
    await request.delete(`/api/members/${memberId}/injuries/${created._id}`);
  });

  test('member adds a medication — golden path', async ({ page, request }) => {
    await page.goto('/member/health');
    await page.getByRole('button', { name: '+ Add Medication' }).click();

    // Fill medication dialog
    await page.getByPlaceholder('e.g. Metoprolol 50mg').fill('Vitamin D 1000IU E2E');
    await page.getByPlaceholder('e.g. High blood pressure').fill('Supplement');

    // Select duration
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Long-term' }).click();

    // Start date
    await page.locator('input[type="date"]').first().fill('2026-05-01');

    await page.getByRole('button', { name: 'Add Medication' }).click();
    await expect(page.getByText('Vitamin D 1000IU E2E')).toBeVisible();

    // Cleanup
    const memberId = await getMemberId(request);
    const res = await request.get(`/api/members/${memberId}/medications`);
    const meds = (await res.json()) as Array<{ _id: string; name: string }>;
    for (const med of meds) {
      if (med.name === 'Vitamin D 1000IU E2E') {
        await request.delete(`/api/members/${memberId}/medications/${med._id}`);
      }
    }
  });

  test('end medication via confirm dialog', async ({ page }) => {
    await page.goto('/member/health');
    await expect(page.getByText('E2E End Medication')).toBeVisible();

    const medCard = page.locator('li').filter({ hasText: 'E2E End Medication' });
    await medCard.getByRole('button', { name: 'End medication' }).click();

    // Confirm dialog
    await expect(page.getByRole('heading', { name: 'Mark as ended?' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark Ended' }).click();

    // Ended medication moves to the collapsed Ended section
    await expect(page.getByText(/Ended · \d+/i)).toBeVisible();
  });

  test('member edits medical history — golden path', async ({ page, request }) => {
    await page.goto('/member/health');

    // Click the pencil edit icon inside the Medical History card
    await page.getByRole('button', { name: 'Edit medical history' }).click();

    // The inline form appears — fill Allergies
    const allergiesInput = page.getByPlaceholder('e.g. Penicillin, peanuts');
    await allergiesInput.fill('Penicillin E2E test');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Penicillin E2E test')).toBeVisible();

    // Reset via API
    const memberId = await getMemberId(request);
    await request.put(`/api/members/${memberId}/medical-history`, {
      data: {
        chronicConditions: [],
        surgeries: null,
        allergies: null,
        familyHistory: null,
        currentDoctor: null,
        emergencyContact: null,
        pregnancyStatus: null,
      },
    });
  });
});
