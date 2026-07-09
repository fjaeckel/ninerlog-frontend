import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, seedAircraft, type AuthContext } from './helpers';

test.describe('QuickLog aircraft selection', () => {
  let auth: AuthContext;

  test.beforeAll(async ({ request }) => {
    auth = await createTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, auth);
  });

  test('should select an existing aircraft from the dropdown', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-EXST', type: 'PA28' });
    await page.goto('/quicklog');
    await expect(page.getByRole('heading', { name: 'Quick Log' })).toBeVisible();

    const select = page.locator('#quicklog-aircraft');
    await expect(select).toBeVisible();
    await select.selectOption({ label: 'D-EXST — PA28' });

    await expect(select).toHaveValue('D-EXST');
    await expect(page.getByRole('button', { name: 'OFF BLOCK' })).toBeEnabled();
  });

  test('should quick-add a new aircraft via the dropdown "Add new aircraft" option', async ({ page }) => {
    await page.goto('/quicklog');

    const select = page.locator('#quicklog-aircraft');
    await select.selectOption({ label: '+ Add new aircraft' });

    await expect(page.getByText('Add a new aircraft to your fleet')).toBeVisible();

    // Quick-add is the only place free-text keyboard entry is required
    await page.getByPlaceholder('Registration (e.g. D-EFGH)').fill('D-EVER');
    await page.getByPlaceholder('Type (e.g. C172)').fill('C172');
    await page.getByPlaceholder('Make (e.g. Cessna)').fill('Cessna');
    await page.getByPlaceholder('Model (e.g. 172 Skyhawk)').fill('172 Skyhawk');
    await page.getByRole('button', { name: 'Save Aircraft' }).click();

    // Quick-add box closes and the dropdown now holds the newly created aircraft
    await expect(page.getByText('Add a new aircraft to your fleet')).toBeHidden({ timeout: 10000 });
    await expect(select).toHaveValue('D-EVER');
    await expect(page.getByRole('button', { name: 'OFF BLOCK' })).toBeEnabled();
  });

  test('should let the pilot cancel out of quick-add back to the dropdown', async ({ page }) => {
    await seedAircraft(page, auth.accessToken, { registration: 'D-CNCL', type: 'PA28' });
    await page.goto('/quicklog');

    const select = page.locator('#quicklog-aircraft');
    await select.selectOption({ label: 'D-CNCL — PA28' });
    await select.selectOption({ label: '+ Add new aircraft' });
    await expect(page.getByText('Add a new aircraft to your fleet')).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByText('Add a new aircraft to your fleet')).toBeHidden();
    // Falls back to the previously selected aircraft, not a blank slate
    await expect(select).toHaveValue('D-CNCL');
  });

  test('should surface a 409 conflict when another device just added the same tail number', async ({ page }) => {
    await page.goto('/quicklog');

    const select = page.locator('#quicklog-aircraft');
    await select.selectOption({ label: '+ Add new aircraft' });

    await page.getByPlaceholder('Registration (e.g. D-EFGH)').fill('D-RACE');
    await page.getByPlaceholder('Type (e.g. C172)').fill('C172');
    await page.getByPlaceholder('Make (e.g. Cessna)').fill('Cessna');
    await page.getByPlaceholder('Model (e.g. 172 Skyhawk)').fill('172 Skyhawk');

    // A second device (or tab) registers the same tail number first — the
    // client's aircraft list is now stale relative to the server.
    await seedAircraft(page, auth.accessToken, { registration: 'D-RACE', type: 'C172' });

    await page.getByRole('button', { name: 'Save Aircraft' }).click();

    // Inline API error, quick-add box stays open so the pilot can retry
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Add a new aircraft to your fleet')).toBeVisible();
  });
});
