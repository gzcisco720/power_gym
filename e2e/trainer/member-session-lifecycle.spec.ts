import { test, expect } from '@playwright/test';

// When a trainer logs on behalf of a member and abandons it, the member's
// plan-page lifecycle UX is what surfaces it — and so is the trainer's
// /trainer/members/[id]/plan page. This spec verifies the trainer side.

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function clearActive(
  request: import('@playwright/test').APIRequestContext,
  memberId: string,
) {
  const r = await request.get(`/api/sessions?memberId=${memberId}`);
  const sessions = (await r.json()) as { _id: string; completedAt: string | null }[];
  for (const s of sessions) {
    if (s.completedAt == null) {
      await request.delete(`/api/sessions/${s._id}`);
    }
  }
}

test.describe('trainer: member plan session lifecycle', () => {
  test('trainer sees resume banner on member plan page when an active session exists', async ({ page, request }) => {
    // Discover the seeded member's id by navigating to the members page and
    // reading the URL after clicking — same pattern other trainer specs use.
    await page.goto('/trainer/members');
    await page.getByText('Test Member').click();
    await page.waitForURL(/\/trainer\/members\/[^/]+$/);
    const memberId = page.url().split('/').pop()!;

    await clearActive(request, memberId);

    // Trainer creates an active session on behalf of the member.
    const planRes = await request.get(`/api/members/${memberId}/plan`);
    const plan = (await planRes.json()) as { _id: string };
    const create = await request.post('/api/sessions', {
      data: { memberId, memberPlanId: plan._id, dayNumber: 1 },
    });
    expect(create.ok()).toBe(true);

    await page.goto(`/trainer/members/${memberId}/plan`);

    await expect(page.getByText(/Push session in progress/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /continue/i })).toBeVisible();

    await clearActive(request, memberId);
  });
});
