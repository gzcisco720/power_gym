import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/trainer.json' });

async function goToPhotosTab(page: import('@playwright/test').Page) {
  await page.goto('/trainer/members');
  await page.getByRole('link', { name: 'View Hub →' }).first().click();
  await page.waitForURL(/\/trainer\/members\/.+$/);
  await page.getByRole('link', { name: 'Photos', exact: true }).click();
  await page.waitForURL(/\/trainer\/members\/.+\/photos$/);
}

test.describe('Trainer: Member Photos Tab', () => {
  test('Photos tab shows grid of seeded photos from check-ins', async ({ page }) => {
    await goToPhotosTab(page);
    // Seed has 12 photos across 8 check-ins (picsum.photos URLs)
    const photos = page.locator('img[src*="picsum.photos"]');
    await expect(photos.first()).toBeVisible();
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
  });

  test('photos grid shows total count label', async ({ page }) => {
    await goToPhotosTab(page);
    // Header shows "N photos" count
    await expect(page.getByText(/\d+ photos/)).toBeVisible();
  });

  test('Select button is visible and enters select mode', async ({ page }) => {
    await goToPhotosTab(page);
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible();
    await page.getByRole('button', { name: 'Select' }).click();
    // Instruction text appears in select mode
    await expect(page.getByText('Tap to select photos')).toBeVisible();
  });

  test('clicking a photo in select mode shows badge 1 and selection count', async ({ page }) => {
    await goToPhotosTab(page);
    await page.getByRole('button', { name: 'Select' }).click();

    // Click the first photo button
    await page.locator('button[type="button"]').filter({ has: page.locator('img[src*="picsum.photos"]') }).first().click();

    // Badge "1" appears on the selected photo
    await expect(page.getByText('1').first()).toBeVisible();
    // Status updates to "1 of 2 selected"
    await expect(page.getByText('1 of 2 selected')).toBeVisible();
  });

  test('selecting two photos shows 2 of 2 selected and Compare Photos button', async ({ page }) => {
    await goToPhotosTab(page);
    await page.getByRole('button', { name: 'Select' }).click();

    const photoButtons = page.locator('button[type="button"]').filter({ has: page.locator('img[src*="picsum.photos"]') });
    await photoButtons.nth(0).click();
    await photoButtons.nth(1).click();

    await expect(page.getByText('2 of 2 selected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compare Photos' })).toBeVisible();
  });

  test('clicking Compare Photos opens comparison popup with two images', async ({ page }) => {
    await goToPhotosTab(page);
    await page.getByRole('button', { name: 'Select' }).click();

    const photoButtons = page.locator('button[type="button"]').filter({ has: page.locator('img[src*="picsum.photos"]') });
    await photoButtons.nth(0).click();
    await photoButtons.nth(1).click();

    await page.getByRole('button', { name: 'Compare Photos' }).click();

    // Popup title and close button are visible
    await expect(page.getByText('Photo Comparison')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close comparison' })).toBeVisible();
    // Popup contains 2 comparison images (alt="Check-in …" without "photo")
    const popupImgs = page.locator('img[alt^="Check-in "]').filter({ hasNot: page.locator('[alt*="photo"]') });
    await expect(popupImgs.nth(0)).toBeVisible();
    await expect(popupImgs.nth(1)).toBeVisible();
  });

  test('close comparison button dismisses the popup', async ({ page }) => {
    await goToPhotosTab(page);
    await page.getByRole('button', { name: 'Select' }).click();

    const photoButtons = page.locator('button[type="button"]').filter({ has: page.locator('img[src*="picsum.photos"]') });
    await photoButtons.nth(0).click();
    await photoButtons.nth(1).click();
    await page.getByRole('button', { name: 'Compare Photos' }).click();

    await page.getByRole('button', { name: 'Close comparison' }).click();

    // Popup dismissed — Compare Photos button returns to bar
    await expect(page.getByRole('button', { name: 'Compare Photos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close comparison' })).not.toBeVisible();
  });

  test('exiting select mode clears selection and hides compare bar', async ({ page }) => {
    await goToPhotosTab(page);
    await page.getByRole('button', { name: 'Select' }).click();

    const photoButtons = page.locator('button[type="button"]').filter({ has: page.locator('img[src*="picsum.photos"]') });
    await photoButtons.first().click();
    await expect(page.getByText('1 of 2 selected')).toBeVisible();

    // "Cancel" button exits select mode
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Back to normal mode — "Select" button visible, selection cleared
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible();
    await expect(page.getByText('1 of 2 selected')).not.toBeVisible();
  });
});
