import { test, expect } from '@playwright/test';
import { createTestUser, login, type AuthContext } from './helpers';

let auth: AuthContext;

test.beforeAll(async ({ request }) => {
  auth = await createTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await login(page, auth.email);
});

test.describe('Reports Page', () => {
  test('should display reports page', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports' }).first().click();
    await expect(page).toHaveURL('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 10000 });
  });

  test('should have time range selector', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports' }).first().click();
    await expect(page.getByRole('button', { name: '6mo' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '12mo' })).toBeVisible();
    await expect(page.getByRole('button', { name: '24mo' })).toBeVisible();
  });

  test('should have export buttons', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports' }).first().click();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
  });
});

test.describe('Export Page', () => {
  test('should display export options', async ({ page }) => {
    await page.getByRole('link', { name: 'Export' }).first().click();
    await expect(page).toHaveURL('/export');
    await expect(page.getByText('Export Data')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Flight Log CSV')).toBeVisible();
    await expect(page.getByText('Full Data Backup')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PDF Logbook' })).toBeVisible();
  });
});

test.describe('Map Page', () => {
  test('should display map', async ({ page }) => {
    await page.getByRole('link', { name: 'Map' }).first().click();
    await expect(page).toHaveURL('/map');
    await expect(page.getByText('Route Map')).toBeVisible({ timeout: 10000 });
  });

  test('should have view toggle buttons', async ({ page }) => {
    await page.getByRole('link', { name: 'Map' }).first().click();
    await expect(page.getByRole('button', { name: 'Routes' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Activity' })).toBeVisible();
  });
});

test.describe('Import Page', () => {
  test('should display import page', async ({ page }) => {
    await page.getByRole('link', { name: 'Import' }).first().click();
    await expect(page).toHaveURL('/import');
    await expect(page.getByText('Import Flights')).toBeVisible({ timeout: 10000 });
  });
});
