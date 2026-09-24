import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, seedLicense, seedClassRating, seedCredential, type AuthContext } from './helpers';

test.describe('Currency Page', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('should display currency page', async ({ page }) => {
    await page.getByRole('link', { name: 'Currency' }).first().click();
    await expect(page).toHaveURL('/currency');
    await expect(page.getByText('Currency & Recency')).toBeVisible({ timeout: 10000 });
  });

  test('should show currency card for a class rating', async ({ page }) => {
    const license = await seedLicense(page, auth.accessToken);
    await seedClassRating(page, auth.accessToken, license.id);
    await page.getByRole('link', { name: 'Currency' }).first().click();
    await expect(page.getByRole('heading', { name: /rating.*currency/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show pooled aircraft classes for a LAPL(A) rating', async ({ page }) => {
    const license = await seedLicense(page, auth.accessToken, { licenseType: 'LAPL(A)', licenseNumber: `LAPL-${Date.now()}` });
    await seedClassRating(page, auth.accessToken, license.id, { classType: 'SEP_LAND', expiryDate: null });
    await seedClassRating(page, auth.accessToken, license.id, { classType: 'TMG', expiryDate: null });
    await page.getByRole('link', { name: 'Currency' }).first().click();
    await expect(page.getByTestId('currency-counted-classes').first()).toContainText('all aeroplanes and TMG', { timeout: 10000 });
  });

  test('should show credentials section', async ({ page }) => {
    await seedCredential(page, auth.accessToken);
    await page.getByRole('link', { name: 'Currency' }).first().click();
    // Let the client-side navigation land first. Reloading while it is still
    // in flight aborts it, which WebKit surfaces as "Frame load interrupted".
    await expect(page).toHaveURL('/currency');
    await page.reload();
    await expect(page.getByText('Credentials').first()).toBeVisible({ timeout: 10000 });
  });
});
