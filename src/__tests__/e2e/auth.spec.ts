import { test, expect } from '@playwright/test';
import { registerAndLogin, login, createTestUser, type AuthContext } from './helpers';

const TEST_PASSWORD = 'TestPassword123!';

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

  test('should reject wrong password', async ({ page }) => {
    // Register a fresh user inline to avoid rate limit from createTestUser
    const email = `e2e-badpw-${Date.now()}@test.ninerlog.app`;
    await page.goto('/register');
    await page.locator('#name').fill('Bad PW Test');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    // Logout
    await page.locator('header').getByText('Logout').click();
    await expect(page).toHaveURL('/login');
    // Try wrong password
    await page.locator('#email').fill(email);
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
