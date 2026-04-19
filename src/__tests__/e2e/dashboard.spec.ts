import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, seedAircraft, seedFlight, seedLicense, seedClassRating, type AuthContext } from './helpers';

test.describe('Dashboard', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('should show empty state for new user', async ({ page }) => {
    await expect(page.getByText('No flights logged yet')).toBeVisible({ timeout: 10000 });
  });

  test('should show stats after seeding a flight', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-DSH1' });
    await seedFlight(page, auth.accessToken, { aircraftReg: 'D-DSH1' });
    await page.reload();
    await expect(page.getByText('Total Time')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total Flights')).toBeVisible({ timeout: 5000 });
  });

  test('should show currency section with a license', async ({ page }) => {
    const license = await seedLicense(page, auth.accessToken);
    await seedClassRating(page, auth.accessToken, license.id);
    await page.reload();
    await expect(page.getByText('Flight Currency')).toBeVisible({ timeout: 10000 });
  });
});
