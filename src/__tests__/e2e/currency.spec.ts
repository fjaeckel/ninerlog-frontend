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

  test('should show credentials section', async ({ page }) => {
    await seedCredential(page, auth.accessToken);
    await page.getByRole('link', { name: 'Currency' }).first().click();
    await page.reload();
    await expect(page.getByText('Credentials').first()).toBeVisible({ timeout: 10000 });
  });
});
