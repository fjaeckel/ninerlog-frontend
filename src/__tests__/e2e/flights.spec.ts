import { test, expect } from '@playwright/test';
import { createTestUser, login, seedFlight, seedAircraft, type AuthContext } from './helpers';

test.describe('Flights', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, auth.email);
  });

  test('should show Flight Log page', async ({ page }) => {
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await expect(page).toHaveURL('/flights');
    await expect(page.getByText('Flight Log')).toBeVisible({ timeout: 10000 });
  });

  test('should display flights after seeding', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-FLT1' });
    await seedFlight(page, auth.accessToken, { aircraftReg: 'D-FLT1', departureIcao: 'EDOI', arrivalIcao: 'EDAZ' });
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await expect(page.getByText('EDOI')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('EDAZ')).toBeVisible();
  });

  test('should create a flight via the form', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-FLT2' });
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await page.getByRole('button', { name: '+ Log Flight' }).click();
    await expect(page.getByText('Log New Flight')).toBeVisible();

    await page.locator('#date').fill('2025-07-01');
    await page.locator('#aircraftReg').fill('D-FLT2');
    await page.locator('#departureIcao').fill('EDDF');
    await page.locator('#arrivalIcao').fill('EDDM');
    await page.locator('#offBlockTime').fill('09:00');
    await page.locator('#onBlockTime').fill('10:30');
    await page.locator('#landings').fill('1');

    await page.locator('button[type="submit"]').filter({ hasText: 'Log Flight' }).click();
    // After creation the modal closes and the list is refreshed
    await expect(page.getByText('EDDF')).toBeVisible({ timeout: 10000 });
  });

  test('should search flights', async ({ page }) => {
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await page.getByPlaceholder('Search flights').fill('EDDF');
    await page.waitForTimeout(500);
    await expect(page.getByText('EDDF')).toBeVisible({ timeout: 10000 });
  });

  test('should open filter panel', async ({ page }) => {
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(page.getByText('Date From')).toBeVisible();
    await expect(page.getByText('Date To')).toBeVisible();
  });

  test('should delete a flight', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-FLT3' });
    await seedFlight(page, auth.accessToken, { aircraftReg: 'D-FLT3', departureIcao: 'LFPG', arrivalIcao: 'LFPO' });
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await expect(page.getByText('LFPG')).toBeVisible({ timeout: 10000 });

    // Find the delete button in the row containing LFPG
    const row = page.locator('tr, [class*="border-b"]').filter({ hasText: 'LFPG' });
    await row.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText('Delete flight?')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Flight' }).click();

    await expect(page.getByText('LFPG')).not.toBeVisible({ timeout: 10000 });
  });
});
