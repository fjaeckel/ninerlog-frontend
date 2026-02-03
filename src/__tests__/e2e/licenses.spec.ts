import { test, expect } from '@playwright/test';

test.describe('License Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: { id: '123', email: 'test@example.com', name: 'Test Pilot' },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh',
        }),
      });
    });
    
    await page.route('**/api/v1/licenses', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    });
    
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
    
    // Navigate to licenses page
    await page.getByRole('link', { name: /licenses/i }).click();
    await expect(page).toHaveURL('/licenses');
  });

  test('should display empty state when no licenses', async ({ page }) => {
    await expect(page.getByText(/you haven't added any licenses yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /add your first license/i })).toBeVisible();
  });

  test('should open license form modal', async ({ page }) => {
    await page.getByRole('button', { name: /add license/i }).click();
    await expect(page.getByRole('heading', { name: /add license/i })).toBeVisible();
    await expect(page.getByLabel(/license type/i)).toBeVisible();
  });

  test('should create a new license', async ({ page }) => {
    await page.getByRole('button', { name: /add license/i }).click();
    
    // Fill out the form
    await page.getByLabel(/license type/i).selectOption('EASA_PPL');
    await page.getByLabel(/license number/i).fill('PPL-12345');
    await page.getByLabel(/issuing authority/i).fill('EASA');
    await page.getByLabel(/issue date/i).fill('2024-01-01');
    await page.getByLabel(/expiry date/i).fill('2026-01-01');
    
    // Mock API response
    await page.route('**/api/v1/licenses', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: '456',
            licenseType: 'EASA_PPL',
            licenseNumber: 'PPL-12345',
            issuingAuthority: 'EASA',
            issueDate: '2024-01-01',
            expiryDate: '2026-01-01',
            isActive: true,
          }),
        });
      }
    });
    
    await page.getByRole('button', { name: /add license/i }).nth(1).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: /add license/i })).not.toBeVisible();
  });

  test('should display license cards', async ({ page }) => {
    // Unroute the existing empty licenses mock
    await page.unroute('**/api/v1/licenses');
    
    // Mock API with licenses
    await page.route('**/api/v1/licenses', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              licenseType: 'EASA_PPL',
              licenseNumber: 'PPL-12345',
              issuingAuthority: 'EASA',
              issueDate: '2024-01-01',
              expiryDate: '2026-01-01',
              isActive: true,
            },
            {
              id: '2',
              licenseType: 'EASA_SPL',
              licenseNumber: 'SPL-67890',
              issuingAuthority: 'EASA',
              issueDate: '2023-06-01',
              isActive: true,
            },
          ]),
        });
      }
    });
    
    await page.reload();
    
    // Wait for licenses to load
    await page.waitForSelector('.card', { timeout: 5000 });
    
    // Verify both licenses are displayed
    await expect(page.getByRole('heading', { name: 'EASA PPL' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EASA SPL' })).toBeVisible();
  });

  test('should edit a license', async ({ page }) => {
    // Setup with existing license
    await page.route('**/api/v1/licenses', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: '1',
              licenseType: 'EASA_PPL',
              licenseNumber: 'PPL-12345',
              issuingAuthority: 'EASA',
              issueDate: '2024-01-01',
              isActive: true,
            },
          ]),
        });
      }
    });
    
    await page.reload();
    
    // Click edit button
    await page.getByRole('button', { name: /edit/i }).first().click();
    
    // Update license number
    const licenseNumberInput = page.getByLabel(/license number/i);
    await licenseNumberInput.clear();
    await licenseNumberInput.fill('PPL-99999');
    
    // Mock update API
    await page.route('**/api/v1/licenses/1', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: '1',
            licenseType: 'EASA_PPL',
            licenseNumber: 'PPL-99999',
            issuingAuthority: 'EASA',
            issueDate: '2024-01-01',
            isActive: true,
          }),
        });
      }
    });
    
    await page.getByRole('button', { name: /update license/i }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: /edit license/i })).not.toBeVisible();
  });

  test('should delete a license', async ({ page }) => {
    // Setup with existing license
    await page.route('**/api/v1/licenses', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            licenseType: 'EASA_PPL',
            licenseNumber: 'PPL-12345',
            issuingAuthority: 'EASA',
            issueDate: '2024-01-01',
            isActive: true,
          },
        ]),
      });
    });
    
    await page.reload();
    
    // Mock delete API
    await page.route('**/api/v1/licenses/1', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204 });
      }
    });
    
    // Setup dialog handler
    page.on('dialog', (dialog) => dialog.accept());
    
    // Click delete button
    await page.getByRole('button', { name: /delete/i }).click();
  });

  test('should switch active license', async ({ page }) => {
    // Setup with multiple licenses
    await page.route('**/api/v1/licenses', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            licenseType: 'EASA_PPL',
            licenseNumber: 'PPL-12345',
            issuingAuthority: 'EASA',
            issueDate: '2024-01-01',
            isActive: true,
          },
          {
            id: '2',
            licenseType: 'EASA_SPL',
            licenseNumber: 'SPL-67890',
            issuingAuthority: 'EASA',
            issueDate: '2023-06-01',
            isActive: true,
          },
        ]),
      });
    });
    
    await page.reload();
    
    // Should show license switcher with multiple licenses
    await expect(page.getByLabel(/active license/i)).toBeVisible();
    
    // Select different license
    await page.getByLabel(/active license/i).selectOption('2');
    await expect(page.getByText(/flight logs will be associated with this license/i)).toBeVisible();
  });
});
