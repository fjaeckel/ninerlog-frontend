/**
 * Generates real, annotated screenshots of the running app for the Help
 * Base (src/pages/help/figures.tsx), replacing the old hand-drawn SVG
 * mockups. For each figure: fakes an authenticated session + realistic API
 * data via network interception, navigates to the real page, locates the
 * real element(s) to highlight, bakes a "click here" ring/cursor/step-badge
 * overlay onto the page, and screenshots the viewport — in both themes.
 *
 * Usage:
 *   npm run dev                              # in one terminal
 *   node scripts/help-screenshots/generate.mjs [figure-id ...]   # in another
 *
 * Dev-tooling only — never imported by the app itself.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fixtures from './fixtures.mjs';
import { installApiMocks } from './mock.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'help');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const VIEWPORT = { width: 1360, height: 900 };
const AMBER = '#f59e0b';

function baseState() {
  return {
    user: fixtures.user,
    aircraft: structuredClone(fixtures.aircraft),
    flights: structuredClone(fixtures.flights),
    licenses: structuredClone(fixtures.licenses),
    classRatingsByLicense: structuredClone(fixtures.classRatingsByLicense),
    credentials: structuredClone(fixtures.credentials),
    currencyStatus: structuredClone(fixtures.currencyStatus),
    statistics: structuredClone(fixtures.statistics),
    statsByClass: structuredClone(fixtures.statsByClass),
    trends: structuredClone(fixtures.trends),
    flightSession: null,
    signaturesByFlight: {},
  };
}

async function seedSession(page, theme) {
  await page.addInitScript(({ user, theme }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user,
        isAuthenticated: true,
        accessToken: 'fake-access-token',
        refreshToken: 'fake-refresh-token',
        tokenExpiresAt: Date.now() + 3600_000,
        expiresIn: 3600,
      },
      version: 0,
    }));
    localStorage.setItem('ninerlog-theme', JSON.stringify({ state: { theme }, version: 0 }));
    localStorage.setItem('ninerlog-onboarding', JSON.stringify({ state: { completedUserIds: [user.id] }, version: 0 }));
    localStorage.setItem('i18nextLng', 'en');
  }, { user: fixtures.user, theme });
}

/** Injects the baked-in "click here" overlay directly onto the live page before the screenshot is taken. */
async function paintHighlights(page, items) {
  await page.evaluate(({ items, amber }) => {
    document.getElementById('__help_shot_overlay__')?.remove();
    const container = document.createElement('div');
    container.id = '__help_shot_overlay__';
    Object.assign(container.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(container);

    for (const { x, y, width, height, kind, step } of items) {
      const pad = 8;
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${x - pad}px`,
        top: `${y - pad}px`,
        width: `${width + pad * 2}px`,
        height: `${height + pad * 2}px`,
        border: `3px dashed ${amber}`,
        borderRadius: '14px',
        boxShadow: `0 0 0 4px rgba(245,158,11,0.18), 0 6px 18px rgba(0,0,0,0.28)`,
        background: 'rgba(245,158,11,0.07)',
      });
      container.appendChild(ring);

      if (kind === 'ring-cursor') {
        const cursor = document.createElement('div');
        Object.assign(cursor.style, {
          position: 'fixed',
          left: `${x + width + pad + 4}px`,
          top: `${y + height + pad + 2}px`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
        });
        cursor.innerHTML = '<svg width="30" height="34" viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg"><path d="M1 1 L1 19 L5.5 14.5 L8.5 21.5 L12 20 L8.7 13 L15.5 13 Z" fill="#1e293b" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
        container.appendChild(cursor);
      }

      if (kind === 'ring-step' && step) {
        const badge = document.createElement('div');
        Object.assign(badge.style, {
          position: 'fixed',
          left: `${x - pad - 12}px`,
          top: `${y - pad - 12}px`,
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: amber,
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '13px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        });
        badge.textContent = String(step);
        container.appendChild(badge);
      }
    }
  }, { items, amber: AMBER });
}

function combineBoxes(boxes) {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.width));
  const y2 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: x2 - x, height: y2 - y };
}

async function boxOf(locator, kind = 'ring', step) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('boundingBox() returned null — element not visible');
  return { ...box, kind, step };
}

const FIGURES = [
  {
    id: 'nav-overview',
    route: '/dashboard',
    waitFor: (page) => page.locator('aside[aria-label="Desktop navigation"] [data-tour="dashboard"]'),
    highlights: async (page) => [await boxOf(page.locator('aside[aria-label="Desktop navigation"] [data-tour="flights"]'))],
  },
  {
    id: 'theme-toggle',
    route: '/profile',
    waitFor: (page) => page.getByRole('button', { name: 'Light theme' }),
    highlights: async (page) => [
      await boxOf(page.getByRole('button', { name: 'Light theme' }).locator('xpath=..')),
    ],
  },
  {
    id: 'add-flight',
    route: '/flights',
    waitFor: (page) => page.getByRole('button', { name: '+ Log Flight' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: '+ Log Flight' }), 'ring-cursor')],
  },
  {
    id: 'flight-form',
    route: '/flights',
    waitFor: (page) => page.getByRole('button', { name: '+ Log Flight' }),
    beforeCapture: async (page) => {
      await page.getByRole('button', { name: '+ Log Flight' }).click();
      const crew = page.getByRole('group', { name: 'Crew' });
      await crew.waitFor({ state: 'visible' });
      await crew.getByRole('textbox').first().fill('John Doe');
      await crew.locator('select').selectOption('SIC');
      await crew.getByRole('button', { name: 'Add' }).click();
    },
    highlights: async (page) => [await boxOf(page.getByRole('group', { name: 'Crew' }))],
  },
  {
    id: 'flight-search',
    route: '/flights',
    waitFor: (page) => page.getByRole('button', { name: 'Search syntax and tags' }),
    beforeCapture: async (page) => {
      await page.getByRole('button', { name: 'Search syntax and tags' }).click();
      await page.waitForTimeout(150);
    },
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: 'Search syntax and tags' }), 'ring-cursor')],
  },
  {
    id: 'quicklog',
    route: '/quicklog',
    stateOverrides: (state) => { state.aircraft = [fixtures.aircraft[0]]; },
    waitFor: (page) => page.getByRole('button', { name: 'OFF BLOCK' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: 'OFF BLOCK' }), 'ring-cursor')],
  },
  {
    id: 'add-aircraft',
    route: '/aircraft',
    waitFor: (page) => page.getByRole('button', { name: '+ Add Aircraft' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: '+ Add Aircraft' }), 'ring-cursor')],
  },
  {
    id: 'currency-status',
    route: '/currency',
    waitFor: (page) => page.locator('[data-testid^="currency-card-"]').first(),
    highlights: async (page) => [await boxOf(page.locator('[data-testid^="currency-card-"]').first())],
  },
  {
    id: 'add-license',
    route: '/licenses',
    waitFor: (page) => page.getByRole('button', { name: '+ Add Rating' }),
    highlights: async (page) => [
      await boxOf(page.getByRole('button', { name: 'Add License' }), 'ring-step', 1),
      await boxOf(page.getByRole('button', { name: '+ Add Rating' }), 'ring-step', 2),
    ],
  },
  {
    id: 'credentials-status',
    route: '/credentials',
    waitFor: (page) => page.getByRole('button', { name: 'Add Credential' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: 'Add Credential' }), 'ring-cursor')],
  },
  {
    id: 'signature-section',
    route: '/flights/fl-1',
    waitFor: (page) => page.getByRole('button', { name: 'Sign now' }),
    beforeCapture: async (page) => {
      await page.getByRole('button', { name: 'Sign now' }).scrollIntoViewIfNeeded();
    },
    highlights: async (page) => {
      const boxes = await Promise.all([
        page.getByRole('button', { name: 'Sign now' }).boundingBox(),
        page.getByRole('button', { name: 'Request via email' }).boundingBox(),
      ]);
      return [{ ...combineBoxes(boxes), kind: 'ring' }];
    },
  },
  {
    id: 'import-steps',
    route: '/import',
    waitFor: (page) => page.getByText('1. Upload CSV', { exact: true }),
    highlights: async (page) => [await boxOf(page.getByText('1. Upload CSV', { exact: true }))],
  },
  {
    id: 'reports-overview',
    route: '/reports',
    waitFor: (page) => page.getByRole('button', { name: '12mo' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: '12mo' }), 'ring-cursor')],
  },
  {
    id: 'profile-tabs',
    route: '/profile',
    waitFor: (page) => page.getByRole('button', { name: 'Account' }),
    beforeCapture: async (page) => {
      await page.getByRole('button', { name: 'Account' }).click();
      await page.waitForTimeout(150);
    },
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: 'Account' }), 'ring-cursor')],
  },
  {
    id: 'dashboard-overview',
    route: '/dashboard',
    waitFor: (page) => page.getByRole('button', { name: '+ Log Flight' }),
    highlights: async (page) => [await boxOf(page.getByRole('button', { name: '+ Log Flight' }), 'ring-cursor')],
  },
];

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const requested = process.argv.slice(2);
  const figures = requested.length ? FIGURES.filter((f) => requested.includes(f.id)) : FIGURES;

  const browser = await chromium.launch();
  const errors = [];

  for (const figure of figures) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: theme });
      const page = await context.newPage();
      try {
        const state = baseState();
        figure.stateOverrides?.(state);
        await installApiMocks(page, state);
        await seedSession(page, theme);
        await page.goto(`${BASE_URL}${figure.route}`, { waitUntil: 'domcontentloaded' });
        await figure.waitFor(page).waitFor({ state: 'visible', timeout: 15000 });
        await figure.beforeCapture?.(page);
        await page.waitForTimeout(200);
        const items = await figure.highlights(page);
        await paintHighlights(page, items);
        const outPath = path.join(OUT_DIR, `${figure.id}-${theme}.png`);
        await page.screenshot({ path: outPath });
        console.log(`✓ ${figure.id} (${theme}) -> ${path.relative(process.cwd(), outPath)}`);
      } catch (err) {
        console.error(`✗ ${figure.id} (${theme}):`, err.message);
        errors.push(`${figure.id} (${theme}): ${err.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  if (errors.length) {
    console.error(`\n${errors.length} figure(s) failed:\n` + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`\nAll ${figures.length} figures captured.`);
}

run();
