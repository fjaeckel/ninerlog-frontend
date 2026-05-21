import { test, expect } from '@playwright/test';
import { registerAndLogin, login, createTestUser } from './helpers';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('should show validation on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create one').click();
    await expect(page).toHaveURL('/register');
  });

  test('should navigate to password reset page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL('/reset-password');
  });

  test('should register and reach dashboard', async ({ page }) => {
    await registerAndLogin(page);
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login with existing account', async ({ page, request }) => {
    const auth = await createTestUser(request);
    await login(page, auth.email);
    await expect(page).toHaveURL('/dashboard');
  });

  test('should reject wrong password', async ({ page, request }) => {
    // Register a fresh user via API helper so verification is handled.
    const auth = await createTestUser(request);
    await page.goto('/login');
    // Try wrong password
    await page.locator('#email').fill(auth.email);
    await page.locator('#password').fill('wrongpassword!!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.locator('[class*="bg-red"]')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should logout and redirect to login', async ({ page }) => {
    await registerAndLogin(page);
    await page.locator('header').getByText('Logout').click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Email Verification', () => {
  test('register shows the check-your-email view (no auto-login)', async ({ page }) => {
    const email = `e2e-verify-ui-${Date.now()}@test.ninerlog.app`;
    await page.goto('/register');
    await page.locator('#name').fill('Verify UI');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // The UI no longer redirects to /dashboard — it shows the
    // "Check your email" view instead.
    await expect(page.getByTestId('check-email-view')).toBeVisible({ timeout: 15000 });
    await expect(page).not.toHaveURL('/dashboard');
  });

  test('login before verifying shows the email-not-verified banner', async ({ page, request }) => {
    const email = `e2e-verify-block-${Date.now()}@test.ninerlog.app`;
    // Register via API but skip the verification step.
    const regRes = await request.post('/api/v1/auth/register', {
      data: { name: 'Blocked', email, password: 'TestPassword123!' },
    });
    expect(regRes.ok()).toBeTruthy();

    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByTestId('email-not-verified-banner')).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL('/dashboard');
  });
});
