import { test, expect } from '@playwright/test';
import { createTestUser, login, seedLicense, type AuthContext } from './helpers';

test.describe('Licenses', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, auth.email);
  });

  test('should show empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Licenses' }).first().click();
    await expect(page).toHaveURL('/licenses');
    await expect(page.getByText('Add your first license')).toBeVisible({ timeout: 10000 });
  });

  test('should display seeded license', async ({ page }) => {
    await seedLicense(page, auth.accessToken, { regulatoryAuthority: 'EASA', licenseType: 'PPL' });
    await page.getByRole('link', { name: 'Licenses' }).first().click();
    await page.reload();
    await expect(page.getByText('EASA PPL')).toBeVisible({ timeout: 10000 });
  });

  test('should create license via form', async ({ page }) => {
    await page.getByRole('link', { name: 'Licenses' }).first().click();
    await page.getByRole('button', { name: '+ Add License' }).first().click();

    await page.locator('#regulatoryAuthority').fill('CAA');
    await page.locator('#licenseType').fill('ATPL');
    await page.locator('#licenseNumber').fill('ATPL-999');
    await page.locator('#issuingAuthority').fill('CAA UK');
    await page.locator('#issueDate').fill('2022-06-01');

    await page.locator('button[type="submit"]').filter({ hasText: 'Add License' }).click();
    await expect(page.getByRole('heading', { name: /CAA ATPL/i })).toBeVisible({ timeout: 10000 });
  });
});
