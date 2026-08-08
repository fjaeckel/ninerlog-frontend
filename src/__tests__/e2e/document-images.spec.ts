import { test, expect, type Page } from '@playwright/test';
import { createTestUser, injectAuth, seedCredential, seedLicense, type AuthContext } from './helpers';

/**
 * A real 1×1 PNG. The API decodes every upload and refuses anything that only
 * claims to be an image, so a fixture of arbitrary bytes would be rejected.
 */
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function openCredentialEditForm(page: Page, matchText: string) {
  await page.goto('/credentials');
  await expect(page.getByText(matchText)).toBeVisible({ timeout: 10000 });
  await page
    .locator('[class*="card"]')
    .filter({ hasText: matchText })
    .first()
    .getByRole('button', { name: 'Edit' })
    .click();
  await expect(page.getByRole('heading', { name: 'Edit Credential' })).toBeVisible();
}

test.describe('Document images', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('uploads, shows and deletes a credential photo', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'Photo AME' });
    await openCredentialEditForm(page, 'Photo AME');

    await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible();
    await expect(page.getByText('No photos yet.')).toBeVisible();

    await page.getByTestId('document-image-input').setInputFiles({
      name: 'medical-front.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });

    // The bytes come back over an authenticated request and are rendered from
    // a blob URL — an <img> that resolved means the whole round trip worked.
    const photo = page.getByRole('button', { name: /view full size/i });
    await expect(photo).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1 of 5')).toBeVisible();

    await page.getByRole('button', { name: 'Delete photo' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete photo' }).click();
    await expect(page.getByText('No photos yet.')).toBeVisible({ timeout: 10000 });
  });

  test('refuses a file that is not a supported image', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'Reject AME' });
    await openCredentialEditForm(page, 'Reject AME');

    await page.getByTestId('document-image-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await expect(page.getByRole('alert')).toContainText(/only jpeg and png/i);
    await expect(page.getByText('No photos yet.')).toBeVisible();
  });

  test('offers photos on a licence only once it has been saved', async ({ page }) => {
    await page.goto('/licenses');
    await page.getByRole('button', { name: 'Add License' }).first().click();
    await expect(page.getByText(/save the record first/i)).toBeVisible();

    const license = await seedLicense(page, auth.accessToken, { licenseNumber: 'PHOTO-LIC-1' });
    await page.goto('/licenses');
    await expect(page.getByText('PHOTO-LIC-1')).toBeVisible({ timeout: 10000 });

    await page
      .locator('[class*="card"]')
      .filter({ hasText: 'PHOTO-LIC-1' })
      .first()
      .getByRole('button', { name: 'Edit' })
      .click();

    await page.getByTestId('document-image-input').setInputFiles({
      name: 'licence-front.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });
    await expect(page.getByText('1 of 5')).toBeVisible({ timeout: 10000 });
    expect(license.id).toBeTruthy();
  });
});
