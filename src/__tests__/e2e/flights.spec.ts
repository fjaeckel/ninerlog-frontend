import { test, expect, type Page } from '@playwright/test';
import { createTestUser, injectAuth, seedFlight, seedAircraft, type AuthContext } from './helpers';

/**
 * Both flight-list layouts stay in the DOM (card list `lg:hidden`, table
 * `hidden lg:block`); desktop projects assert against the table by name.
 */
const flightTable = (page: Page) => page.getByRole('table', { name: 'Flight Log' });

test.describe('Flights', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
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
    await expect(flightTable(page).getByText('EDOI')).toBeVisible({ timeout: 10000 });
    await expect(flightTable(page).getByText('EDAZ')).toBeVisible();
  });

  test('should create a flight via the form', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-FLT2' });
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await page.getByRole('button', { name: 'Log Flight' }).click();
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
    await expect(flightTable(page).getByText('EDDF')).toBeVisible({ timeout: 10000 });
  });

  test('should search flights', async ({ page }) => {
    // Seeds its own flight.
    await seedAircraft(page, auth.accessToken, { registration: 'D-FLT4' });
    await seedFlight(page, auth.accessToken, { aircraftReg: 'D-FLT4', departureIcao: 'EGLL', arrivalIcao: 'EGKK' });
    await page.getByRole('link', { name: 'Flights' }).first().click();
    await page.getByPlaceholder('Search flights').fill('EGLL');
    await expect(flightTable(page).getByText('EGLL')).toBeVisible({ timeout: 10000 });
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
    const table = flightTable(page);
    await expect(table.getByText('LFPG')).toBeVisible({ timeout: 10000 });

    // Row-level actions exist only in the table.
    const row = table.getByRole('row').filter({ hasText: 'LFPG' });
    await row.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText('Delete flight?')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Flight' }).click();

    await expect(table.getByText('LFPG')).not.toBeVisible({ timeout: 10000 });
  });
});
