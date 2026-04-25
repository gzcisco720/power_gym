import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Invites', () => {
  test('pending invite appears in list', async ({ page }) => {
    await page.goto('/owner/invites');
    await expect(page.getByText('newtrainer@test.com')).toBeVisible();
  });

  test('full invite flow: create invite, register, login succeeds', async ({ page, browser }) => {
    const response = await page.request.post('/api/owner/invites', {
      data: { recipientEmail: 'e2einvite@test.com', role: 'trainer' },
    });
    expect(response.ok()).toBeTruthy();
    const { inviteUrl } = (await response.json()) as { inviteUrl: string };

    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    await freshPage.goto(inviteUrl);
    await expect(freshPage.getByText(/invited as a/i)).toBeVisible();

    await freshPage.fill('#name', 'E2E Invite User');
    await freshPage.fill('#email', 'e2einvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: /create account/i }).click();
    await freshPage.waitForURL('/login');

    await freshPage.fill('#email', 'e2einvite@test.com');
    await freshPage.fill('#password', 'TestPass123!');
    await freshPage.getByRole('button', { name: 'Sign in' }).click();
    await freshPage.waitForURL('/trainer/members');
    await expect(freshPage).toHaveURL('/trainer/members');

    await freshCtx.close();
  });
});
