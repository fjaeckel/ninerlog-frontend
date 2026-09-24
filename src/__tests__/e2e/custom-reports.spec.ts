import { test, expect } from '@playwright/test';
import { registerAndLogin, getAccessToken, seedFlight } from './helpers';

test.describe('Custom reports', () => {
  test('save a flight search as a report, view it and export it', async ({ page }) => {
    await registerAndLogin(page);
    const token = await getAccessToken(page);
    await seedFlight(page, token, { date: '2026-03-10', aircraftReg: 'D-EABC' });
    await seedFlight(page, token, { date: '2026-05-10', aircraftReg: 'D-EABC' });
    await seedFlight(page, token, { date: '2026-05-12', aircraftReg: 'D-EXYZ', aircraftType: 'PA28' });

    await page.goto('/flights?q=reg%3AD-EABC');
    await page.getByRole('button', { name: 'Save as report' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Smoke report');
    await dialog.getByLabel('Time window').selectOption('all');
    await expect(dialog.getByText(/2 flights/)).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Save report' }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    await page.goto('/reports#custom');
    await expect(page.getByRole('heading', { name: 'Smoke report' })).toBeVisible();

    for (const [label, ext] of [['Export CSV', 'csv'], ['Export PDF', 'pdf']] as const) {
      await page.getByRole('button', { name: /Actions for Smoke report/ }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('menuitem', { name: label }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`^ninerlog_report_smoke-report_.*\\.${ext}$`));
    }
  });
});
