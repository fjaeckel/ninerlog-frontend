import { Page, expect } from '@playwright/test';

/**
 * E2E test helpers — uses REAL API, no mocks.
 *
 * Each test suite registers a fresh user with a unique email,
 * then logs in via the UI. Data is seeded via direct API calls.
 */

// Generate unique email per test run to avoid conflicts
let userCounter = 0;
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${++userCounter}@test.ninerlog.app`;
}

const TEST_PASSWORD = 'TestPassword123!';

/** Stored auth state after login */
export interface AuthContext {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
}

/**
 * Register a new user via direct API call and return auth context.
 * Retries on 429 (rate limit) with exponential backoff.
 */
export async function createTestUser(request: import('@playwright/test').APIRequestContext): Promise<AuthContext> {
  const email = uniqueEmail();

  let regRes;
  for (let attempt = 0; attempt < 10; attempt++) {
    regRes = await request.post('/api/v1/auth/register', {
      data: { name: 'E2E Test Pilot', email, password: TEST_PASSWORD },
    });
    if (regRes.status() !== 429) break;
    // Wait before retrying (3s, 6s, 9s, ...)
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }

  if (!regRes!.ok()) {
    throw new Error(`Registration failed: ${regRes!.status()} ${await regRes!.text()}`);
  }
  const regData = await regRes!.json();

  return {
    email,
    password: TEST_PASSWORD,
    accessToken: regData.accessToken,
    userId: regData.user?.id || '',
  };
}

/**
 * Register a new user via the UI and return auth context.
 */
export async function registerAndLogin(page: Page): Promise<AuthContext> {
  const email = uniqueEmail();

  await page.goto('/register');
  await page.locator('#name').fill('E2E Test Pilot');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.locator('#confirmPassword').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();

  // Should redirect to dashboard after successful registration
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  // Wait for the Layout to be fully rendered (header with Logout button)
  await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible({ timeout: 10000 });

  // Get a fresh token by logging in via API (the UI registration token may not be accessible)
  const loginRes = await page.request.post('/api/v1/auth/login', {
    data: { email, password: TEST_PASSWORD },
  });
  const loginData = await loginRes.json();
  const accessToken = loginData.accessToken || '';
  const userId = loginData.user?.id || '';

  return { email, password: TEST_PASSWORD, accessToken, userId };
}

/**
 * Login an existing user via the UI.
 */
export async function login(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible({ timeout: 10000 });
}

/**
 * Get current access token from the page's localStorage.
 */
export async function getAccessToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.state?.accessToken || '';
  });
}

/**
 * Make an authenticated API call using Playwright's request context.
 * The token must be passed from the AuthContext returned by registerAndLogin.
 */
export async function apiCall(
  page: Page,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<any> {
  const opts: any = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.data = body;

  let res;
  const url = `/api/v1${path}`;
  switch (method.toUpperCase()) {
    case 'POST':
      res = await page.request.post(url, opts);
      break;
    case 'PUT':
      res = await page.request.put(url, opts);
      break;
    case 'PATCH':
      res = await page.request.patch(url, opts);
      break;
    case 'DELETE':
      res = await page.request.delete(url, opts);
      break;
    default:
      res = await page.request.get(url, opts);
  }

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed: ${res.status()} ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Seed a license via API. Returns the created license.
 */
export async function seedLicense(page: Page, token: string, overrides: Record<string, unknown> = {}) {
  return apiCall(page, 'POST', '/licenses', {
    regulatoryAuthority: 'EASA',
    licenseType: 'PPL',
    licenseNumber: `PPL-${Date.now()}`,
    issuingAuthority: 'LBA',
    issueDate: '2020-01-15',
    requiresSeparateLogbook: false,
    ...overrides,
  }, token);
}

/**
 * Seed a class rating via API. Returns the created class rating.
 */
export async function seedClassRating(page: Page, token: string, licenseId: string, overrides: Record<string, unknown> = {}) {
  return apiCall(page, 'POST', `/licenses/${licenseId}/ratings`, {
    classType: 'SEP_LAND',
    issueDate: '2020-01-15',
    expiryDate: '2027-01-15',
    ...overrides,
  }, token);
}

/**
 * Seed an aircraft via API. Returns the created aircraft.
 */
export async function seedAircraft(page: Page, token: string, overrides: Record<string, unknown> = {}) {
  return apiCall(page, 'POST', '/aircraft', {
    registration: `D-E${String(Date.now()).slice(-3)}`,
    type: 'C172',
    make: 'Cessna',
    model: '172 Skyhawk',
    aircraftClass: 'SEP_LAND',
    isComplex: false,
    isHighPerformance: false,
    isTailwheel: false,
    isActive: true,
    ...overrides,
  }, token);
}

/**
 * Seed a credential via API. Returns the created credential.
 */
export async function seedCredential(page: Page, token: string, overrides: Record<string, unknown> = {}) {
  return apiCall(page, 'POST', '/credentials', {
    credentialType: 'EASA_CLASS2_MEDICAL',
    credentialNumber: `MED-${Date.now()}`,
    issueDate: '2025-01-15',
    expiryDate: '2027-01-15',
    issuingAuthority: 'EASA AME',
    ...overrides,
  }, token);
}

/**
 * Seed a flight via API. Returns the created flight.
 */
export async function seedFlight(page: Page, token: string, overrides: Record<string, unknown> = {}) {
  return apiCall(page, 'POST', '/flights', {
    date: '2025-06-10',
    aircraftReg: 'D-EFGH',
    aircraftType: 'C172',
    departureIcao: 'EDOI',
    arrivalIcao: 'EDAZ',
    offBlockTime: '08:00:00',
    onBlockTime: '10:00:00',
    landings: 1,
    ...overrides,
  }, token);
}
