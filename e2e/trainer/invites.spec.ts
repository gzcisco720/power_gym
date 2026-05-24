import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/trainer.json' });

test.describe('Trainer: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/trainer/invites');
    await expect(page.getByText('trainer-invited@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register as member, login succeeds', async ({ page, browser }) => {
    const uniqueEmail = `e2etrainerinvite-${Date.now()}@test.com`;
    const response = await page.request.post('/api/trainer/invites', {
      data: { recipientEmail: uniqueEmail },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    // Verify invite email
    const email = await waitForEmailTo(uniqueEmail);
    expect(email.Subject).toContain('Member');
    expect(email.HTML).toContain(inviteUrl);

    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#firstName', 'E2E');
    await freshPage.fill('#lastName', 'TrainerInviteUser');
    await freshPage.fill('#email', uniqueEmail);
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/member');
    await expect(freshPage).toHaveURL('/member');

    await freshCtx.close();
  });

  test('resend invite sends email again to pending recipient', async ({ page }) => {
    const before = new Date();
    const listRes = await page.request.get('/api/trainer/invites');
    const invites = (await listRes.json()) as Array<{ _id: string; recipientEmail: string }>;
    const pending = invites.find((i) => i.recipientEmail === 'trainer-invited@test.com');
    expect(pending).toBeDefined();

    const resendRes = await page.request.post(`/api/trainer/invites/${pending!._id}/resend`);
    expect(resendRes.ok()).toBeTruthy();

    const email = await waitForEmailTo('trainer-invited@test.com', { since: before });
    expect(email.Subject).toContain('Member');
    expect(email.HTML).toContain('register');
  });
});
