import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Treat the in-docker frontend origin as secure so that
          // window.PublicKeyCredential is exposed for WebAuthn tests.
          args: [
            '--unsafely-treat-insecure-origin-as-secure=http://app.ninerlog.test:5173,http://frontend-dev:5173',
          ],
        },
      },
    },
    ...(process.env.E2E_MOBILE
      ? [
          {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
          },
        ]
      : []),
  ],

  // Skip webServer when running in Docker (CI) — the frontend-dev container serves it
  ...(!process.env.CI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  }),
});
