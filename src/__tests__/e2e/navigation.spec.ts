import { test, expect } from '@playwright/test';
import { createTestUser, login, type AuthContext } from './helpers';

test.describe('Navigation — Desktop', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, auth.email);
  });

  test('should navigate to all pages from sidebar', async ({ page }) => {
    const pages = [
      { label: 'Flights', url: '/flights' },
      { label: 'Aircraft', url: '/aircraft' },
      { label: 'Currency', url: '/currency' },
      { label: 'Licenses', url: '/licenses' },
      { label: 'Credentials', url: '/credentials' },
      { label: 'Reports', url: '/reports' },
      { label: 'Map', url: '/map' },
      { label: 'Import', url: '/import' },
      { label: 'Export', url: '/export' },
      { label: 'Help', url: '/help' },
      { label: 'Profile & Settings', url: '/profile' },
    ];

    for (const p of pages) {
      await page.getByRole('link', { name: p.label }).first().click();
      await expect(page).toHaveURL(p.url);
    }
  });
});

test.describe('Navigation — Mobile', () => {
  let auth: AuthContext;

  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, auth.email);
  });

  test('should show bottom nav and More menu', async ({ page }) => {
    // Bottom nav items
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Flights' }).first()).toBeVisible();

    // Open More menu
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('link', { name: 'Aircraft' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Currency' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Licenses' })).toBeVisible();
  });

  test('should navigate via More menu', async ({ page }) => {
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('link', { name: 'Aircraft' }).click();
    await expect(page).toHaveURL('/aircraft');
  });
});
