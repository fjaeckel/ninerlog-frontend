import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

// Cloud backup settings flow. Requires the API to be running with
// BACKUP_CREDENTIALS_KEY set and a reachable S3-compatible service. In the
// docker e2e environment (docker-compose.test.yml) this is provided by a
// SeaweedFS container at "seaweedfs-test:8333" with a pre-created bucket
// "ninerlog-backups".
//
// When running locally without those services, this suite is auto-skipped.

const S3_ENDPOINT = process.env.E2E_S3_ENDPOINT || 'http://seaweedfs-test:8333';
const S3_BUCKET = process.env.E2E_S3_BUCKET || 'ninerlog-backups';
const S3_ACCESS_KEY = process.env.E2E_S3_ACCESS_KEY || 'ninerlogadmin';
const S3_SECRET_KEY = process.env.E2E_S3_SECRET_KEY || 'ninerlogsecret';

test.describe('Cloud Backups', () => {
  test('create, test, run, view history, and delete an S3 destination', async ({ page, request }) => {
    const auth = await registerAndLogin(page);

    // Skip if the API hasn't enabled cloud backups (no BACKUP_CREDENTIALS_KEY)
    const probe = await request.get('/api/v1/backups/providers', {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    test.skip(probe.status() === 503, 'Cloud backups not enabled on the API');
    if (!probe.ok()) {
      throw new Error(`Backups endpoint not reachable: ${probe.status()} ${await probe.text()}`);
    }

    // Cloud backups now live under Profile Settings → Cloud Backups tab.
    await page.goto('/profile');
    await page.getByRole('button', { name: /cloud backups/i }).click();
    await expect(page.getByText(/no backup destinations/i)).toBeVisible();

    await page.getByRole('button', { name: /add your first destination|add destination/i }).first().click();

    // Provider should default to S3
    await expect(page.getByLabel(/provider/i)).toBeVisible();
    await page.getByLabel(/display name/i).fill('E2E S3 bucket');
    await page.getByLabel(/^Bucket/i).fill(S3_BUCKET);
    await page.getByLabel(/^Region/i).fill('us-east-1');
    await page.getByLabel(/endpoint url/i).fill(S3_ENDPOINT);
    await page.getByLabel(/access key id/i).fill(S3_ACCESS_KEY);
    await page.getByLabel(/secret access key/i).fill(S3_SECRET_KEY);

    await page.getByRole('button', { name: /create destination/i }).click();

    // Card visible
    const card = page.locator('[data-testid="backup-destination"]', { hasText: 'E2E S3 bucket' });
    await expect(card).toBeVisible({ timeout: 15000 });

    // Test connection
    await card.getByTestId('backup-test').click();
    await expect(page.getByRole('status')).toContainText(/succeeded/i, { timeout: 15000 });

    // Run now
    await card.getByTestId('backup-run').click();
    await expect(page.getByRole('status')).toContainText(/completed successfully/i, { timeout: 30000 });

    // View history
    await card.getByTestId('backup-history').click();
    const historyDialog = page.getByRole('dialog', { name: /history/i });
    await expect(historyDialog).toBeVisible();
    await expect(historyDialog.getByText(/success/i).first()).toBeVisible({ timeout: 10000 });
    await historyDialog.getByRole('button', { name: /close/i }).click();

    // Delete
    await card.getByTestId('backup-delete').click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(page.getByText(/no backup destinations/i)).toBeVisible({ timeout: 10000 });
  });
});
