import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { registerAndLogin } from './helpers';

/**
 * Passkey / WebAuthn end-to-end tests.
 *
 * Uses Chromium's WebAuthn DevTools protocol to install a virtual authenticator,
 * so the registration and login ceremonies can complete without a real
 * platform authenticator.
 *
 * Docs: https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */

interface VirtualAuth {
  cdp: CDPSession;
  authenticatorId: string;
}

async function installVirtualAuthenticator(page: Page): Promise<VirtualAuth> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

test.describe('Passkeys (WebAuthn)', () => {
  test.beforeEach(async ({ request, page }) => {
    // Skip if the API is not configured for WebAuthn (no WEBAUTHN_RP_ID).
    const probe = await request.post('/api/v1/auth/webauthn/login/options', { data: {} });
    test.skip(probe.status() === 503, 'WebAuthn is not configured on the API server');

    // Skip if the browser does not expose window.PublicKeyCredential.
    // The docker e2e dev server runs over plain http:// on a non-loopback
    // hostname, which is not a secure context, so PublicKeyCredential is
    // undefined and the WebAuthn flow cannot be exercised end-to-end.
    // Tracked in https://github.com/fjaeckel/ninerlog-frontend/issues/46
    // (enable HTTPS on the e2e dev server). Production / localhost / HTTPS
    // origins always expose PublicKeyCredential.
    await page.goto('/login');
    const hasWebAuthn = await page.evaluate(() => typeof (window as any).PublicKeyCredential === 'function');
    test.skip(
      !hasWebAuthn,
      'window.PublicKeyCredential is not exposed in this browser context (insecure origin). ' +
        'Run the suite against an HTTPS or localhost origin to exercise the WebAuthn flow.',
    );
  });

  test('register a passkey from the profile page and see it listed', async ({ page }) => {
    const auth = await installVirtualAuthenticator(page);

    await registerAndLogin(page);
    await page.goto('/profile');

    // Switch to the Account tab where the passkey section lives.
    await page.getByRole('button', { name: /^account$/i }).click();

    const passkeyHeading = page.getByRole('heading', { name: /^passkeys$/i });
    await expect(passkeyHeading).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/no passkeys registered/i)).toBeVisible();

    await page.locator('#passkey-label').fill('E2E Test Passkey');
    await page.getByRole('button', { name: /^add passkey$/i }).click();

    // Newly registered passkey should appear in the list.
    await expect(page.getByText('E2E Test Passkey')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/no passkeys registered/i)).not.toBeVisible();

    // Verify the credential was actually written to the virtual authenticator.
    const { credentials } = await auth.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: auth.authenticatorId,
    });
    expect(credentials.length).toBeGreaterThanOrEqual(1);
  });

  test('revoke a registered passkey', async ({ page }) => {
    await installVirtualAuthenticator(page);

    await registerAndLogin(page);
    await page.goto('/profile');
    await page.getByRole('button', { name: /^account$/i }).click();

    await page.locator('#passkey-label').fill('Throwaway');
    await page.getByRole('button', { name: /^add passkey$/i }).click();
    await expect(page.getByText('Throwaway')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /revoke/i }).click();
    await expect(page.getByText('Throwaway')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/no passkeys registered/i)).toBeVisible();
  });

  test('sign in with a registered passkey', async ({ page, context }) => {
    const auth = await installVirtualAuthenticator(page);

    // Step 1 — register an account + passkey on the first page.
    const { email } = await registerAndLogin(page);
    await page.goto('/profile');
    await page.getByRole('button', { name: /^account$/i }).click();
    await page.locator('#passkey-label').fill('Login Passkey');
    await page.getByRole('button', { name: /^add passkey$/i }).click();
    await expect(page.getByText('Login Passkey')).toBeVisible({ timeout: 10000 });

    // Sanity: the credential is stored.
    const { credentials } = await auth.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: auth.authenticatorId,
    });
    expect(credentials.length).toBeGreaterThanOrEqual(1);

    // Step 2 — log out.
    await page.locator('header').getByText('Logout').click();
    await expect(page).toHaveURL('/login');

    // Step 3 — clear localStorage so the next page is unauthenticated.
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Step 4 — fill email so the server can advertise a credential, then
    // click the passkey button. The virtual authenticator answers without
    // user interaction (automaticPresenceSimulation = true).
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.getByRole('button', { name: /sign in with passkey/i }).click();

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible({ timeout: 10000 });
  });
});
