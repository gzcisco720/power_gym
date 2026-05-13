import { test, expect } from '@playwright/test';
import { clearInbox, waitForEmailTo } from '../helpers/mailpit';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/owner/invites');
    await expect(page.getByText('pending@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register, login succeeds', async ({ page, browser }) => {
    await clearInbox();
    const response = await page.request.post('/api/owner/invites', {
      data: { recipientEmail: 'e2einvite@test.com', role: 'trainer' },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    // Verify invite email
    const email = await waitForEmailTo('e2einvite@test.com');
    expect(email.Subject).toContain('Trainer');
    expect(email.HTML).toContain(inviteUrl);

    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#firstName', 'E2E');
    await freshPage.fill('#lastName', 'InviteUser');
    await freshPage.fill('#email', 'e2einvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/trainer/members');
    await expect(freshPage).toHaveURL('/trainer/members');

    await freshCtx.close();
  });
});
