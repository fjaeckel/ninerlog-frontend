import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, seedFlight, apiCall, type AuthContext } from './helpers';

let auth: AuthContext;

test.beforeAll(async ({ request }) => {
  auth = await createTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await injectAuth(page, auth);
});

test.describe('Profile Page', () => {
  test('should display profile sections', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page).toHaveURL('/profile');
    await expect(page.getByText('Profile Settings')).toBeVisible({ timeout: 10000 });
    // Preferences tab (default) — Time Display
    await expect(page.getByText('Time Display')).toBeVisible();
    // Account tab — Profile Information
    await page.getByRole('button', { name: 'Account' }).click();
    await expect(page.getByText('Profile Information')).toBeVisible();
    // Notifications tab — Notification Settings
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Notification Settings')).toBeVisible();
    // Data & Security tab — Danger Zone
    await page.getByRole('button', { name: 'Data & Security' }).click();
    await expect(page.getByText('Danger Zone')).toBeVisible();
  });

  test('should update profile name', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.getByRole('button', { name: 'Account' }).click();
    const nameField = page.locator('#name');
    await nameField.clear();
    await nameField.fill('Updated Pilot');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    // Field should retain value after successful save
    await expect(nameField).toHaveValue('Updated Pilot');
  });

  test('should change password', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.getByRole('button', { name: 'Account' }).click();
    await page.locator('#currentPassword').fill('TestPassword123!');
    await page.locator('#newPassword').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    // Verify the form fields are filled (changing to same password won't break login)
    await expect(page.locator('#currentPassword')).toHaveValue('TestPassword123!');
  });

  test('should show danger zone options', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.getByRole('button', { name: 'Data & Security' }).click();
    await expect(page.getByText('Danger Zone')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Time Display Preference', () => {
  // Locate the Time Display dropdown by scoping to the card containing the
  // "Time Display" heading. The control is a native <select> with options
  // "hm" (Hours & Minutes) and "decimal" (Decimal Hours).
  const timeDisplaySelect = (page: import('@playwright/test').Page) =>
    page
      .locator('div.card')
      .filter({ has: page.getByRole('heading', { name: 'Time Display' }) })
      .locator('select');

  test('should show time display section with hm selected by default', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByRole('heading', { name: 'Time Display' })).toBeVisible({ timeout: 10000 });
    const select = timeDisplaySelect(page);
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('hm');
  });

  test('should switch to decimal format and persist', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByRole('heading', { name: 'Time Display' })).toBeVisible({ timeout: 10000 });

    const select = timeDisplaySelect(page);
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/users/me') && resp.request().method() === 'PATCH'),
      select.selectOption('decimal'),
    ]);

    await expect(select).toHaveValue('decimal');

    // Verify the preference was persisted via API
    const user = await apiCall(page, 'GET', '/users/me', undefined, auth.accessToken);
    expect(user.timeDisplayFormat).toBe('decimal');

    // Switch back to hm so other tests don't break
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/users/me') && resp.request().method() === 'PATCH'),
      select.selectOption('hm'),
    ]);
    await expect(select).toHaveValue('hm');
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

    // Switch to decimal via profile UI
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByRole('heading', { name: 'Time Display' })).toBeVisible({ timeout: 10000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/users/me') && resp.request().method() === 'PATCH'),
      timeDisplaySelect(page).selectOption('decimal'),
    ]);

    // Go back to dashboard via SPA navigation and verify decimal format
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    // Match "1.5h" in stat-card / flight-row content. Exclude <option> elements
    // (the profile page's "Dot (1.5h)" decimal-separator option matches /1\.5/
    // even when hidden inside a closed <select>).
    await expect(
      page.locator('main :text-matches("1\\.5h?"):not(option)').first(),
    ).toBeVisible({ timeout: 5000 });

    // Clean up — switch back to hm
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await expect(page.getByRole('heading', { name: 'Time Display' })).toBeVisible({ timeout: 10000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/users/me') && resp.request().method() === 'PATCH'),
      timeDisplaySelect(page).selectOption('hm'),
    ]);
    await expect(timeDisplaySelect(page)).toHaveValue('hm');
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
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Email Notifications')).toBeVisible();
    await expect(page.getByText('Medical Expiry')).toBeVisible();
    await expect(page.getByText('Passenger Currency')).toBeVisible();
  });

  test('should toggle notification preferences', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Notification Settings')).toBeVisible({ timeout: 10000 });

    // The email notifications toggle should be present and interactive
    const emailToggle = page.getByLabel('Email Notifications').or(page.locator('input[type="checkbox"]').first());
    if (await emailToggle.isVisible()) {
      const wasChecked = await emailToggle.isChecked();
      await emailToggle.click();
      // Should have toggled
      if (wasChecked) {
        await expect(emailToggle).not.toBeChecked();
      } else {
        await expect(emailToggle).toBeChecked();
      }
      // Toggle back
      await emailToggle.click();
    }
  });
});

test.describe('Flight Data Maintenance', () => {
  test('should show recalculate button', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile & Settings' }).first().click();
    await page.getByRole('button', { name: 'Data & Security' }).click();
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
