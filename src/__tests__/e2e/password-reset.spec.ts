import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers';

test.describe('Password Reset', () => {
  test('should navigate to reset password from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL('/reset-password');
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  });

  test('should show email input on reset page', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('should validate email before submitting', async ({ page }) => {
    await page.goto('/reset-password');
    // Submit with empty email to trigger zod validation
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should show success after submitting valid email', async ({ page, request }) => {
    const auth = await createTestUser(request);
    await page.goto('/reset-password');
    await page.locator('#email').fill(auth.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show success for non-existent email too', async ({ page }) => {
    await page.goto('/reset-password');
    await page.locator('#email').fill('nonexistent@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    // Should still show success (no user enumeration)
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show invalid link page when no token', async ({ page }) => {
    await page.goto('/new-password');
    await expect(page.getByText(/invalid reset link/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /request new link/i })).toBeVisible();
  });

  test('should show new password form with token', async ({ page }) => {
    await page.goto('/new-password?token=test-token');
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
  });

  test('should validate password minimum length', async ({ page }) => {
    await page.goto('/new-password?token=test-token');
    await page.locator('#newPassword').fill('short');
    await page.locator('#confirmPassword').fill('short');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/at least 12 characters/i)).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto('/new-password?token=test-token');
    await page.locator('#newPassword').fill('NewPassword123!');
    await page.locator('#confirmPassword').fill('DifferentPass123!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/new-password?token=invalid-token');
    await page.locator('#newPassword').fill('NewPassword123!');
    await page.locator('#confirmPassword').fill('NewPassword123!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.locator('[class*="bg-red"]')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to login from reset page', async ({ page }) => {
    await page.goto('/reset-password');
    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL('/login');
  });
});
