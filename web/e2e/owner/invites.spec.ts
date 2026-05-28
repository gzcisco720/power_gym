import { test, expect } from '@playwright/test';
import { waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/owner/invites');
    await expect(page.getByText('pending@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register, login succeeds', async ({ page, browser }) => {
    const uniqueEmail = `e2einvite-${Date.now()}@test.com`;
    const response = await page.request.post('/api/owner/invites', {
      data: { recipientEmail: uniqueEmail, role: 'trainer' },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    // Verify invite email
    const email = await waitForEmailTo(uniqueEmail);
    expect(email.Subject).toContain('Trainer');
    expect(email.HTML).toContain(inviteUrl);

    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#firstName', 'E2E');
    await freshPage.fill('#lastName', 'InviteUser');
    await freshPage.fill('#email', uniqueEmail);
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/trainer/members');
    await expect(freshPage).toHaveURL('/trainer/members');

    await freshCtx.close();
  });

  test('resend invite sends email again to pending recipient', async ({ page }) => {
    const before = new Date();
    const listRes = await page.request.get('/api/owner/invites');
    const invites = (await listRes.json()) as Array<{ _id: string; recipientEmail: string; role: string }>;
    const pending = invites.find((i) => i.recipientEmail === 'pending@test.com');
    expect(pending).toBeDefined();

    const resendRes = await page.request.post(`/api/owner/invites/${pending!._id}/resend`);
    expect(resendRes.ok()).toBeTruthy();

    const email = await waitForEmailTo('pending@test.com', { since: before });
    expect(email.Subject).toContain('Trainer');
    expect(email.HTML).toContain('register');
  });
});
