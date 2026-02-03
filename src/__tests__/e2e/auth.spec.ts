import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pilotlog/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.getByText(/register here/i).click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByText(/create your account/i)).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email address/i)).toBeVisible();
  });

  test('should complete registration flow', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByLabel(/name/i).fill('Test Pilot');
    await page.getByLabel(/email address/i).fill(`test${Date.now()}@example.com`);
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Mock API response
    await page.route('**/api/v1/auth/register', (route) => {
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test Pilot',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        }),
      });
    });
    
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should navigate to dashboard after successful registration
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete login flow', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Mock API response
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test Pilot',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        }),
      });
    });
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should navigate to dashboard after successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.getByText(/forgot password/i).click();
    await expect(page).toHaveURL('/reset-password');
    
    await page.getByLabel(/email address/i).fill('test@example.com');
    
    // Mock API response
    await page.route('**/api/v1/auth/reset-password', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
    
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: { id: '123', email: 'test@example.com' },
          accessToken: 'token',
          refreshToken: 'refresh',
        }),
      });
    });
    
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
    
    // Then logout
    await page.getByRole('button', { name: /logout/i }).click({ force: true });
    await expect(page).toHaveURL('/login');
  });
});
