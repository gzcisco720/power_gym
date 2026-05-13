import { test, expect } from '@playwright/test';
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Check-In', () => {
  test('Check-In nav item is visible in sidebar', async ({ page }) => {
    await page.goto('/member/plan');
    await expect(page.getByRole('link', { name: 'Check-In' })).toBeVisible();
  });

  test('navigating to /member/check-in shows the form', async ({ page }) => {
    await page.goto('/member/check-in');
    await expect(page.getByText('Weekly Check-In')).toBeVisible();
    await expect(page.getByText('Weekly Ratings (1–10)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Check-In' })).toBeVisible();
  });

  test('diet adherence toggle buttons are all present', async ({ page }) => {
    await page.goto('/member/check-in');
    await expect(page.getByRole('button', { name: 'yes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'partial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'no' })).toBeVisible();
  });

  test('can submit the check-in form and sees confirmation', async ({ page }) => {
    await clearInbox();
    await page.goto('/member/check-in');

    // Fill in optional text areas
    await page.getByPlaceholder('Describe your diet this week...').fill('Ate clean all week');
    await page.getByPlaceholder('How are you feeling overall?').fill('Great energy levels');

    await page.getByRole('button', { name: 'Submit Check-In' }).click();

    // After submit, shows already-submitted message
    await expect(page.getByText("You've already submitted your check-in this week.")).toBeVisible();
    // Verify notification email sent to the trainer
    const email = await waitForEmailTo('trainer@test.com', {
      subject: /check-in/i,
    });
    expect(email.Subject).toContain('Test Member');
    expect(email.Subject).toContain('check-in');
    expect(email.HTML).toContain('Test Member');
  });
});
