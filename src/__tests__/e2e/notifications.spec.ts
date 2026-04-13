import { test, expect } from '@playwright/test';
import { createTestUser, login, apiCall, type AuthContext } from './helpers';

let auth: AuthContext;

test.beforeAll(async ({ request }) => {
  auth = await createTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await login(page, auth.email);
});

test.describe('Notification Settings — Categories', () => {
  test('should display all credential category toggles', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // Credentials group
    await expect(page.getByText('Credentials').first()).toBeVisible();
    await expect(page.getByText('Medical Expiry')).toBeVisible();
    await expect(page.getByText('Language Proficiency')).toBeVisible();
    await expect(page.getByText('Security Clearance')).toBeVisible();
    await expect(page.getByText('Other Credentials')).toBeVisible();
  });

  test('should display all currency category toggles', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // Ratings & Currency group
    await expect(page.getByText('Ratings & Currency').first()).toBeVisible();
    await expect(page.getByText('Class Rating Expiry')).toBeVisible();
    await expect(page.getByText('Passenger Currency')).toBeVisible();
    await expect(page.getByText('Night Currency')).toBeVisible();
    await expect(page.getByText('Instrument Currency')).toBeVisible();
    await expect(page.getByText('Flight Review')).toBeVisible();
    await expect(page.getByText('EASA Revalidation')).toBeVisible();
  });

  test('should toggle individual category on and off', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // Find the "Medical Expiry" checkbox
    const medicalLabel = page.locator('label', { hasText: 'Medical Expiry' });
    const medicalCheckbox = medicalLabel.locator('input[type="checkbox"]');
    await expect(medicalCheckbox).toBeVisible();

    // Toggle off
    const wasChecked = await medicalCheckbox.isChecked();
    await medicalCheckbox.click();
    await page.waitForTimeout(500);

    if (wasChecked) {
      await expect(medicalCheckbox).not.toBeChecked();
    } else {
      await expect(medicalCheckbox).toBeChecked();
    }

    // Toggle back
    await medicalCheckbox.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Notification Settings — Warning Schedule', () => {
  test('should display warning day pills', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Warning Schedule')).toBeVisible({ timeout: 10000 });

    // Check all default pill buttons are present
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '14d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '3d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1d' })).toBeVisible();
  });

  test('should toggle warning day pills', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Warning Schedule')).toBeVisible({ timeout: 10000 });

    // The 3d pill should initially be unselected (default is [30, 14, 7])
    const pill3d = page.getByRole('button', { name: '3d' });
    await pill3d.click();
    await page.waitForTimeout(500);

    // Verify via API that 3 was added
    const prefs = await apiCall(page, 'GET', '/users/me/notifications', undefined, auth.accessToken);
    expect(prefs.warningDays).toContain(3);

    // Click again to remove
    await pill3d.click();
    await page.waitForTimeout(500);

    const prefs2 = await apiCall(page, 'GET', '/users/me/notifications', undefined, auth.accessToken);
    expect(prefs2.warningDays).not.toContain(3);
  });
});

test.describe('Notification Settings — Check Hour', () => {
  test('should display check hour selector', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Daily Check Time')).toBeVisible({ timeout: 10000 });

    // Should have a select/dropdown
    const hourSelect = page.locator('select').filter({ hasText: '08:00' });
    await expect(hourSelect).toBeVisible();
  });

  test('should change check hour', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Daily Check Time')).toBeVisible({ timeout: 10000 });

    // Change to 14:00
    const hourSelect = page.locator('label', { hasText: 'Daily Check Time' }).locator('select');
    await hourSelect.selectOption('14');
    await page.waitForTimeout(500);

    // Verify via API
    const prefs = await apiCall(page, 'GET', '/users/me/notifications', undefined, auth.accessToken);
    expect(prefs.checkHour).toBe(14);

    // Reset back to 8
    await hourSelect.selectOption('8');
    await page.waitForTimeout(500);
  });
});

test.describe('Notification Settings — Master Switch', () => {
  test('should disable all toggles when email is off', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // Turn email off
    const emailToggle = page.locator('label', { hasText: 'Email Notifications' }).locator('input[type="checkbox"]');
    if (await emailToggle.isChecked()) {
      await emailToggle.click();
      await page.waitForTimeout(500);
    }

    // All category checkboxes should be disabled
    const categoryCheckboxes = page.locator('label', { hasText: /Medical Expiry|Language Proficiency|Passenger Currency/ }).locator('input[type="checkbox"]');
    const count = await categoryCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(categoryCheckboxes.nth(i)).toBeDisabled();
    }

    // Warning day pills should be disabled
    await expect(page.getByRole('button', { name: '30d' })).toBeDisabled();

    // Check hour select should be disabled
    const hourSelect = page.locator('label', { hasText: 'Daily Check Time' }).locator('select');
    await expect(hourSelect).toBeDisabled();

    // Re-enable email
    await emailToggle.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Notification History', () => {
  test('should display notification history section', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification History')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no notifications sent', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('No notifications sent yet.')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Notification Settings — API persistence', () => {
  test('should persist category changes across page reloads', async ({ page }) => {
    // Set specific categories via API
    await apiCall(page, 'PATCH', '/users/me/notifications', {
      enabledCategories: ['credential_medical', 'rating_expiry', 'currency_passenger'],
    }, auth.accessToken);

    // Reload profile page
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // Medical Expiry should be checked
    const medicalCheckbox = page.locator('label', { hasText: 'Medical Expiry' }).locator('input[type="checkbox"]');
    await expect(medicalCheckbox).toBeChecked();

    // Language Proficiency should NOT be checked
    const langCheckbox = page.locator('label', { hasText: 'Language Proficiency' }).locator('input[type="checkbox"]');
    await expect(langCheckbox).not.toBeChecked();

    // Passenger Currency should be checked
    const passengerCheckbox = page.locator('label', { hasText: 'Passenger Currency' }).locator('input[type="checkbox"]');
    await expect(passengerCheckbox).toBeChecked();

    // Night Currency should NOT be checked
    const nightCheckbox = page.locator('label', { hasText: 'Night Currency' }).locator('input[type="checkbox"]');
    await expect(nightCheckbox).not.toBeChecked();

    // Restore all categories
    await apiCall(page, 'PATCH', '/users/me/notifications', {
      enabledCategories: [
        'credential_medical', 'credential_language', 'credential_security', 'credential_other',
        'rating_expiry', 'currency_passenger', 'currency_night', 'currency_instrument',
        'currency_flight_review', 'currency_revalidation',
      ],
    }, auth.accessToken);
  });
});
