import { test, expect } from '@playwright/test';
import { createTestUser, login, seedCredential, type AuthContext } from './helpers';

test.describe('Credentials', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, auth.email);
  });

  test('should show empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Credentials' }).first().click();
    await expect(page).toHaveURL('/credentials');
    await expect(page.getByText('No credentials added yet.')).toBeVisible({ timeout: 10000 });
  });

  test('should display seeded credential', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { credentialNumber: 'DSP-001' });
    await page.getByRole('link', { name: 'Credentials' }).first().click();
    // Reload to get fresh data since the page may have cached empty state
    await page.reload();
    await expect(page.getByText('EASA Class 2 Medical')).toBeVisible({ timeout: 10000 });
  });

  test('should create credential via form', async ({ page }) => {
    await page.getByRole('link', { name: 'Credentials' }).first().click();
    await page.getByRole('button', { name: '+ Add Credential' }).click();
    await expect(page.getByRole('heading', { name: 'Add Credential' })).toBeVisible();

    await page.locator('#credentialType').selectOption('EASA_CLASS2_MEDICAL');
    await page.locator('#issueDate').fill('2025-03-01');
    await page.locator('#expiryDate').fill('2027-03-01');
    await page.locator('#issuingAuthority').fill('Dr. Test AME');

    await page.locator('button[type="submit"]').filter({ hasText: 'Add Credential' }).click();
    await expect(page.getByText('Dr. Test AME')).toBeVisible({ timeout: 10000 });
  });

  test('should delete credential', async ({ page }) => {
    await seedCredential(page, auth.accessToken, { issuingAuthority: 'ToDelete AME', credentialNumber: 'DEL-001' });
    await page.getByRole('link', { name: 'Credentials' }).first().click();
    await page.reload();
    await expect(page.getByText('ToDelete AME')).toBeVisible({ timeout: 10000 });

    // Find the specific card and its delete button
    const cards = page.locator('[class*="card"], [class*="rounded-lg"]').filter({ hasText: 'ToDelete AME' });
    await cards.first().getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('ToDelete AME')).not.toBeVisible({ timeout: 10000 });
  });
});
