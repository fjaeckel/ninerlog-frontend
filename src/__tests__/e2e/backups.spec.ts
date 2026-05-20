import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers';

// Cloud backup settings flow. Requires the API to be running with
// BACKUP_CREDENTIALS_KEY set and a reachable MinIO service. In the docker
// e2e environment (docker-compose.test.yml) this is provided as
// "minio-test:9000" and a pre-created bucket "ninerlog-backups".
//
// When running locally without those services, this suite is auto-skipped.

const MINIO_ENDPOINT = process.env.E2E_MINIO_ENDPOINT || 'http://minio-test:9000';
const MINIO_BUCKET = process.env.E2E_MINIO_BUCKET || 'ninerlog-backups';

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
    await page.getByLabel(/display name/i).fill('E2E MinIO bucket');
    await page.getByLabel(/^Bucket/i).fill(MINIO_BUCKET);
    await page.getByLabel(/^Region/i).fill('us-east-1');
    await page.getByLabel(/endpoint url/i).fill(MINIO_ENDPOINT);
    await page.getByLabel(/access key id/i).fill('minioadmin');
    await page.getByLabel(/secret access key/i).fill('minioadmin');

    await page.getByRole('button', { name: /create destination/i }).click();

    // Card visible
    const card = page.locator('[data-testid="backup-destination"]', { hasText: 'E2E MinIO bucket' });
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
