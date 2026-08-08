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

test.describe('Document files', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('uploads, shows and deletes a credential file', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'Photo AME' });
    await openCredentialEditForm(page, 'Photo AME');

    // Scope to the edit modal. The card behind it now carries a thumbnail
    // strip of its own, so once a file exists the page holds *two* controls
    // labelled "View full size: <filename>" — one on the card, one in this
    // gallery. An unscoped locator is a strict-mode violation, and `.first()`
    // would silently assert against whichever happened to render first. This
    // test is about the gallery in the form.
    const gallery = page.getByRole('dialog');

    await expect(gallery.getByRole('heading', { name: 'Files' })).toBeVisible();
    await expect(gallery.getByText('No files yet.')).toBeVisible();

    await page.getByTestId('document-file-input').setInputFiles({
      name: 'medical-front.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });

    // The bytes come back over an authenticated request and are rendered from
    // a blob URL — an <img> that resolved means the whole round trip worked.
    await expect(gallery.getByRole('button', { name: /view full size/i })).toBeVisible({ timeout: 10000 });
    await expect(gallery.getByText('1 of 5')).toBeVisible();

    await gallery.getByRole('button', { name: 'Delete file' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete file' }).click();
    await expect(gallery.getByText('No files yet.')).toBeVisible({ timeout: 10000 });
  });

  test('refuses a file that is not a supported format', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'Reject AME' });
    await openCredentialEditForm(page, 'Reject AME');

    await page.getByTestId('document-file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await expect(page.getByRole('alert')).toContainText(/only jpeg, png and pdf/i);
    await expect(page.getByText('No files yet.')).toBeVisible();
  });


  test('accepts a PDF and offers it as a download, never a preview', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'PDF AME' });
    await openCredentialEditForm(page, 'PDF AME');

    // A minimal but structurally real PDF — signature plus %%EOF trailer, which
    // is exactly what the API checks.
    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    );
    await page.getByTestId('document-file-input').setInputFiles({
      name: 'medical.pdf', mimeType: 'application/pdf', buffer: pdf,
    });

    // Shown as an icon tile: the API serves PDFs as an attachment so their
    // bytes never render in this origin, and the client honours that.
    const gallery = page.getByRole('dialog');
    await expect(gallery.getByTestId('document-file-icon')).toBeVisible({ timeout: 10000 });
    await expect(gallery.getByText('1 of 5')).toBeVisible();
    await expect(gallery.getByRole('button', { name: /view full size/i })).toHaveCount(0);

    const download = page.waitForEvent('download');
    await gallery.getByRole('button', { name: 'Download file' }).click();
    expect((await download).suggestedFilename()).toBe('medical.pdf');
  });

  test('offers files on a licence only once it has been saved', async ({ page }) => {
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

    await page.getByTestId('document-file-input').setInputFiles({
      name: 'licence-front.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });
    await expect(page.getByText('1 of 5')).toBeVisible({ timeout: 10000 });
    expect(license.id).toBeTruthy();
  });
});
