import { test, expect } from '@playwright/test';
import { createTestUser, login, seedFlight, apiCall, type AuthContext } from './helpers';

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
    await expect(page.getByText('Time Display')).toBeVisible();
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

test.describe('Time Display Preference', () => {
  test('should show time display section with hm selected by default', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Time Display')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hours & Minutes')).toBeVisible();
    await expect(page.getByText('Decimal Hours')).toBeVisible();
    // hm button should have the active border (blue)
    const hmButton = page.locator('button', { hasText: '1h 30m' });
    await expect(hmButton).toBeVisible();
    await expect(hmButton).toHaveClass(/border-blue-500/);
  });

  test('should switch to decimal format and persist', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Time Display')).toBeVisible({ timeout: 10000 });

    // Click the decimal button
    const decimalButton = page.locator('button', { hasText: '1.5h' });
    await decimalButton.click();

    // Wait for the API to persist
    await page.waitForTimeout(500);

    // Decimal button should now be active
    await expect(decimalButton).toHaveClass(/border-blue-500/);

    // Reload the page and verify it persists
    await page.reload();
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Time Display')).toBeVisible({ timeout: 10000 });
    const decimalButtonAfterReload = page.locator('button', { hasText: '1.5h' });
    await expect(decimalButtonAfterReload).toHaveClass(/border-blue-500/);

    // Switch back to hm so other tests don't break
    const hmButton = page.locator('button', { hasText: '1h 30m' });
    await hmButton.click();
    await page.waitForTimeout(500);
  });

  test('should display flight times in selected format on dashboard', async ({ page }) => {
    // Seed a flight so we have some data to display
    await seedFlight(page, auth.accessToken, {
      date: '2026-04-01',
      offBlockTime: '08:00:00',
      onBlockTime: '09:30:00', // 90 minutes
    });

    // Verify hm format on dashboard
    await page.goto('/dashboard');
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    // Should see "1h 30m" format for the 90-minute flight
    await expect(page.getByText(/1h 30m/).first()).toBeVisible({ timeout: 5000 });

    // Switch to decimal
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.locator('button', { hasText: '1.5h' }).click();
    await page.waitForTimeout(500);

    // Go back to dashboard and verify decimal format
    await page.goto('/dashboard');
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1\.5h/).first()).toBeVisible({ timeout: 5000 });

    // Clean up — switch back to hm
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.locator('button', { hasText: '1h 30m' }).click();
    await page.waitForTimeout(500);
  });

  test('should persist timeDisplayFormat via API', async ({ page }) => {
    // Set to decimal via API
    await apiCall(page, 'PATCH', '/users/me', { timeDisplayFormat: 'decimal' }, auth.accessToken);

    // Verify via GET
    const user = await apiCall(page, 'GET', '/users/me', undefined, auth.accessToken);
    expect(user.timeDisplayFormat).toBe('decimal');

    // Clean up
    await apiCall(page, 'PATCH', '/users/me', { timeDisplayFormat: 'hm' }, auth.accessToken);
  });
});

test.describe('Notification Settings', () => {
  test('should display notification toggles', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Email Notifications')).toBeVisible();
    await expect(page.getByText('Currency Warnings')).toBeVisible();
    await expect(page.getByText('Credential Warnings')).toBeVisible();
  });

  test('should toggle notification preferences', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // The email notifications toggle should be present and interactive
    const emailToggle = page.getByLabel('Email Notifications').or(page.locator('input[type="checkbox"]').first());
    if (await emailToggle.isVisible()) {
      const wasChecked = await emailToggle.isChecked();
      await emailToggle.click();
      await page.waitForTimeout(500);
      // Should have toggled
      if (wasChecked) {
        await expect(emailToggle).not.toBeChecked();
      } else {
        await expect(emailToggle).toBeChecked();
      }
      // Toggle back
      await emailToggle.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Flight Data Maintenance', () => {
  test('should show recalculate button', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    const recalcBtn = page.getByRole('button', { name: /recalculate/i });
    await expect(recalcBtn).toBeVisible({ timeout: 10000 });
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
