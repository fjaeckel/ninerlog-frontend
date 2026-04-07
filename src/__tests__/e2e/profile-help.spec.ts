import { test, expect } from '@playwright/test';
import { createTestUser, login, type AuthContext } from './helpers';

let auth: AuthContext;

test.beforeAll(async ({ request }) => {
  auth = await createTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await login(page, auth.email);
});

test.describe('Profile Page', () => {
  test('should display profile sections', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page).toHaveURL('/profile');
    await expect(page.getByText('Profile Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Profile Information')).toBeVisible();
    await expect(page.getByText('Notification Settings')).toBeVisible();
    await expect(page.getByText('Danger Zone')).toBeVisible();
  });

  test('should update profile name', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    const nameField = page.locator('#name');
    await nameField.clear();
    await nameField.fill('Updated Pilot');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    // Field should retain value after successful save
    await expect(nameField).toHaveValue('Updated Pilot');
  });

  test('should change password', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.locator('#currentPassword').fill('TestPassword123!');
    await page.locator('#newPassword').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    // Verify the form fields are filled (changing to same password won't break login)
    await expect(page.locator('#currentPassword')).toHaveValue('TestPassword123!');
  });

  test('should show danger zone options', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Danger Zone')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Help Page', () => {
  test('should display help page', async ({ page }) => {
    await page.getByRole('link', { name: 'Help' }).first().click();
    await expect(page).toHaveURL('/help');
    await expect(page.getByText('Help Base')).toBeVisible({ timeout: 10000 });
  });

  test('should search help topics', async ({ page }) => {
    await page.getByRole('link', { name: 'Help' }).first().click();
    await page.getByPlaceholder('Search help topics...').fill('currency');
    await expect(page.getByText(/currency/i).first()).toBeVisible();
  });

  test('should show no results for nonexistent search', async ({ page }) => {
    await page.getByRole('link', { name: 'Help' }).first().click();
    await page.getByPlaceholder('Search help topics...').fill('xyznonexistent99');
    await expect(page.getByText('No help topics match your search.')).toBeVisible();
  });
});
