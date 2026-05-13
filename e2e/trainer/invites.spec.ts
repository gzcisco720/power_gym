import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/trainer/invites');
    await expect(page.getByText('trainer-invited@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register as member, login succeeds', async ({ page, browser }) => {
    const response = await page.request.post('/api/trainer/invites', {
      data: { recipientEmail: 'e2etrainerinvite@test.com' },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    // Verify invite email
    const email = await waitForEmailTo('e2etrainerinvite@test.com');
    expect(email.Subject).toContain('Member');
    expect(email.HTML).toContain(inviteUrl);

    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#firstName', 'E2E');
    await freshPage.fill('#lastName', 'TrainerInviteUser');
    await freshPage.fill('#email', 'e2etrainerinvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/member/plan');
    await expect(freshPage).toHaveURL('/member/plan');

    await freshCtx.close();
  });
});
