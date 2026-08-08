import { defineConfig, devices, type Project } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

/**
 * Cross-browser projects.
 *
 * Only `chromium` runs by default — the full matrix is expensive and is meant
 * to be run on demand (CLI or workflow_dispatch), never per PR/commit/merge.
 *
 * Opt in with either:
 *   E2E_BROWSERS=webkit,msedge npx playwright test
 *   npx playwright test --project=webkit          (see selectionFromArgv below)
 *   npm run test:e2e:cross                        (the whole matrix)
 *
 * `chrome` and `msedge` drive the *branded* browsers and need them installed
 * on the host (`npx playwright install chrome msedge`); `webkit` and `firefox`
 * use Playwright's bundled builds.
 */
const ALL_PROJECTS: Record<string, Project> = {
  chromium: {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  chrome: {
    name: 'chrome',
    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  },
  msedge: {
    name: 'msedge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
  // Playwright cannot drive Safari.app — this is its WebKit build, the same
  // engine, which is what catches Safari rendering/JS-engine differences.
  webkit: {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
  firefox: {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  'mobile-chrome': {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 5'] },
  },
  'mobile-safari': {
    name: 'mobile-safari',
    use: { ...devices['iPhone 15'] },
  },
};

const DEFAULT_PROJECT = 'chromium';

/**
 * Playwright rejects `--project=<name>` for a project the config did not
 * define, so honour the flag as a selection source alongside E2E_BROWSERS.
 * Without this, `npx playwright test --project=webkit` would fail unless the
 * env var was also set.
 */
function selectionFromArgv(): string[] {
  const argv = process.argv;
  const names: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project' || argv[i] === '-p') names.push(argv[i + 1] ?? '');
    else if (argv[i].startsWith('--project=')) names.push(argv[i].slice('--project='.length));
  }
  return names;
}

function selectedProjects(): Project[] {
  const explicit = [...(process.env.E2E_BROWSERS ?? '').split(','), ...selectionFromArgv()]
    .map((name) => name.trim())
    .filter(Boolean);

  // Only fall back to chromium when nothing was asked for — an explicit
  // selection is honoured exactly, so `E2E_BROWSERS=webkit` runs webkit alone.
  const requested = new Set<string>([
    ...(explicit.length ? explicit : [DEFAULT_PROJECT]),
    // Back-compat: E2E_MOBILE has always *added* a mobile project.
    ...(process.env.E2E_MOBILE ? ['mobile-chrome'] : []),
  ]);

  const unknown = [...requested].filter((name) => !ALL_PROJECTS[name]);
  if (unknown.length) {
    throw new Error(
      `Unknown E2E browser project(s): ${unknown.join(', ')}. ` +
        `Available: ${Object.keys(ALL_PROJECTS).join(', ')}`,
    );
  }

  // Worker processes re-evaluate this config with a *different* argv, so the
  // --project flags above would be invisible to them and the project list
  // would not match the parent's ("Project X not found in the worker
  // process"). Workers inherit the parent env, so pin the resolved selection
  // there to keep both sides in sync.
  process.env.E2E_BROWSERS = [...requested].join(',');

  return Object.entries(ALL_PROJECTS)
    .filter(([name]) => requested.has(name))
    .map(([, project]) => project);
}

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 4 matches the local Docker stack; the GitHub-hosted PR runner has fewer
  // cores to spare and turns this down via PLAYWRIGHT_WORKERS.
  workers: process.env.CI ? Number(process.env.PLAYWRIGHT_WORKERS || 4) : undefined,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The e2e dev server presents a self-signed certificate (E2E_HTTPS=1). The
    // origin still counts as secure, which is the point — that is what exposes
    // window.PublicKeyCredential and navigator.clipboard.
    ignoreHTTPSErrors: true,
  },

  projects: selectedProjects(),

  // Skip webServer when running in Docker (CI) — the frontend-dev container serves it
  ...(!process.env.CI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  }),
});
