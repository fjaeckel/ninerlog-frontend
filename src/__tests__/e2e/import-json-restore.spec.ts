import { test, expect } from '@playwright/test';
import { createTestUser, injectAuth, apiCall, type AuthContext } from './helpers';

// Full end-to-end JSON backup/restore through the UI:
//
//   1. User A (seeded via API) populates an account with a small but
//      non-trivial profile.
//   2. User A's account is exported to JSON via the API (we don't drive the
//      Export page UI here; that's covered elsewhere).
//   3. User B is created fresh, logged in, and visits /import.
//   4. The user clicks the "Restore JSON Backup" tab, uploads the backup
//      file, and sees the success summary card.
//   5. The /flights and /aircraft API endpoints for user B are then asserted
//      to reflect the restored data — proving the UI flow really wires up to
//      the backend.

test.describe('Import page — JSON restore', () => {
  test('user can restore a JSON backup through the UI', async ({ page, request }) => {
    // ----- 1. Seed source account via API -----
    const source: AuthContext = await createTestUser(request);

    await apiCall(page, 'POST', '/aircraft', {
      registration: 'D-EUIE',
      type: 'C172',
      make: 'Cessna',
      model: '172S',
      aircraftClass: 'SEP_LAND',
    }, source.accessToken);

    await apiCall(page, 'POST', '/aircraft', {
      registration: 'N321UI',
      type: 'B738',
      make: 'Boeing',
      model: '737-800',
      aircraftClass: 'MEP_LAND',
    }, source.accessToken);

    const lic = await apiCall(page, 'POST', '/licenses', {
      regulatoryAuthority: 'EASA',
      licenseType: 'PPL',
      licenseNumber: `UI-PPL-${Date.now()}`,
      issueDate: '2022-03-15',
      issuingAuthority: 'LBA',
    }, source.accessToken);
    await apiCall(page, 'POST', `/licenses/${lic.id}/ratings`, {
      classType: 'SEP_LAND',
      issueDate: '2022-03-15',
    }, source.accessToken);

    await apiCall(page, 'POST', '/credentials', {
      credentialType: 'EASA_CLASS2_MEDICAL',
      credentialNumber: 'UI-MED-001',
      issueDate: '2024-01-01',
      expiryDate: '2027-01-01',
      issuingAuthority: 'AME UI',
    }, source.accessToken);

    await apiCall(page, 'POST', '/flights', {
      date: '2024-09-01',
      aircraftReg: 'D-EUIE',
      aircraftType: 'C172',
      departureIcao: 'EDNY',
      arrivalIcao: 'EDDS',
      offBlockTime: '08:00',
      onBlockTime: '09:00',
      landings: 1,
      remarks: 'UI restore source flight',
    }, source.accessToken);

    await apiCall(page, 'POST', '/flights', {
      date: '2024-10-12',
      aircraftReg: 'N321UI',
      aircraftType: 'B738',
      departureIcao: 'EDDF',
      arrivalIcao: 'KJFK',
      offBlockTime: '12:00',
      onBlockTime: '20:30',
      landings: 1,
      remarks: 'Airline leg',
      crewMembers: [
        { name: 'Capt. UI Test', role: 'PIC' },
        { name: 'FO UI Test', role: 'SIC' },
      ],
    }, source.accessToken);

    // ----- 2. Download source backup via API -----
    const exportRes = await request.get('/api/v1/exports/json', {
      headers: { Authorization: `Bearer ${source.accessToken}` },
    });
    expect(exportRes.ok()).toBeTruthy();
    const backupText = await exportRes.text();
    expect(backupText).toContain('NinerLog JSON Backup');

    // ----- 3. Fresh destination account, log in, go to /import -----
    const dest: AuthContext = await createTestUser(request);
    await injectAuth(page, dest);

    await page.goto('/import');
    await expect(page.getByText('Import Flights')).toBeVisible({ timeout: 10000 });

    // ----- 4. Switch to JSON restore tab + upload backup -----
    await page.getByRole('tab', { name: 'Restore JSON Backup' }).click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /choose json backup/i }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({
      name: 'ninerlog_backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupText),
    });

    // Success card appears with counts.
    await expect(page.getByRole('heading', { name: 'Backup restored' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Aircraft imported')).toBeVisible();
    // Scope the "Flights" label lookup to the main content area to avoid
    // matching the nav link of the same name.
    await expect(page.locator('#main-content').getByText('Flights', { exact: true })).toBeVisible();

    // ----- 5. Verify the destination account really got the data -----
    const restoredAircraft = await apiCall(page, 'GET', '/aircraft', undefined, dest.accessToken);
    const regs = new Set<string>(
      (restoredAircraft.data || []).map((a: { registration: string }) => a.registration),
    );
    expect(regs.has('D-EUIE')).toBeTruthy();
    expect(regs.has('N321UI')).toBeTruthy();

    const restoredFlights = await apiCall(page, 'GET', '/flights?pageSize=50', undefined, dest.accessToken);
    expect((restoredFlights.data || []).length).toBeGreaterThanOrEqual(2);

    const restoredCreds = await apiCall(page, 'GET', '/credentials', undefined, dest.accessToken);
    expect(restoredCreds.length).toBeGreaterThanOrEqual(1);
  });

  test('user sees a clear error when uploading non-NinerLog JSON', async ({ page, request }) => {
    const dest = await createTestUser(request);
    await injectAuth(page, dest);

    await page.goto('/import');
    await page.getByRole('tab', { name: 'Restore JSON Backup' }).click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /choose json backup/i }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({
      name: 'not-ninerlog.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'Some Other Tool' })),
    });

    // The API rejects the foreign format with 400 + error message; the page
    // surfaces it inline (not as a toast).
    await expect(page.getByText(/Unsupported backup format/i)).toBeVisible({ timeout: 10000 });
  });
});
