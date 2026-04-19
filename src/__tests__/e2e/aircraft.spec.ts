import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, seedAircraft, type AuthContext } from './helpers';

test.describe('Aircraft', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('should show empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Aircraft' }).first().click();
    await expect(page).toHaveURL('/aircraft');
    await expect(page.getByText('No aircraft added yet.')).toBeVisible({ timeout: 10000 });
  });

  test('should display seeded aircraft', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-ACR1', type: 'C172' });
    await page.getByRole('link', { name: 'Aircraft' }).first().click();
    await expect(page.getByText('D-ACR1')).toBeVisible({ timeout: 10000 });
  });

  test('should create aircraft via form', async ({ page }) => {
    await page.getByRole('link', { name: 'Aircraft' }).first().click();
    // Use the header "+" button (first one)
    await page.getByRole('button', { name: '+ Add Aircraft' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Aircraft' })).toBeVisible();

    await page.locator('#registration').fill('D-ACR2');
    await page.locator('#type').fill('PA28');
    await page.locator('#make').fill('Piper');
    await page.locator('#model').fill('Cherokee');

    // Submit - the form submit button says "Add Aircraft"
    await page.locator('button[type="submit"]').filter({ hasText: 'Add Aircraft' }).click();
    await expect(page.getByText('D-ACR2')).toBeVisible({ timeout: 10000 });
  });

  test('should edit aircraft', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-ACR3', type: 'C152' });
    await page.getByRole('link', { name: 'Aircraft' }).first().click();
    await expect(page.getByText('D-ACR3')).toBeVisible({ timeout: 10000 });

    // Click Edit on the card containing D-ACR3
    const card = page.locator('.card, [class*="rounded"]').filter({ hasText: 'D-ACR3' });
    await card.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Aircraft' })).toBeVisible();

    await page.locator('#type').clear();
    await page.locator('#type').fill('C172');
    await page.locator('button[type="submit"]').filter({ hasText: 'Update Aircraft' }).click();
  });

  test('should delete aircraft', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-ACR4' });
    await page.getByRole('link', { name: 'Aircraft' }).first().click();
    await expect(page.getByText('D-ACR4')).toBeVisible({ timeout: 10000 });

    const card = page.locator('.card, [class*="rounded"]').filter({ hasText: 'D-ACR4' });
    await card.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText('Delete aircraft?')).toBeVisible();
    // The confirm button in the dialog
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('D-ACR4')).not.toBeVisible({ timeout: 10000 });
  });
});
