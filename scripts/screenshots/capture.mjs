#!/usr/bin/env node
/**
 * Screenshot harness — renders the real app against fixture data and captures
 * every screen in light and dark, so a UI change can be reviewed as it looks
 * rather than as it diffs.
 *
 *   npm run shots -- before                    every target, light + dark
 *   npm run shots -- after flights aircraft    only those targets
 *   npm run shots -- after --mobile            iPhone-sized viewport
 *   npm run shots -- after --mobile --fold     just the first screen, chrome in place
 *   npm run shots -- after --theme=dark        one theme
 *   npm run shots -- --audit [--mobile]        measure instead of capture
 *
 * Output goes to `.screenshots/<label>/<target>.<theme>.png` (gitignored).
 * Capture `before` on the current main, make the change, capture `after`, and
 * compare the pairs.
 *
 * No API is needed: `page.route` answers every `/api/v1/**` call from
 * `fixtures.mjs`. The dev server is started automatically when one is not
 * already listening on the base URL.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { user, bodyFor } from './fixtures.mjs';
import { TARGETS, FAILING_PATHS, EMPTY_BODIES } from './targets.mjs';
import { collectReport, formatReport, TARGET_MIN } from './audit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const BASE_URL = process.env.SHOT_BASE_URL || 'http://localhost:5173';

// `hasTouch`/`isMobile` are what make `(pointer: coarse)` and `(hover: none)`
// match — without them a "mobile" capture is just a narrow desktop, and every
// touch-only rule in the stylesheet is silently skipped.
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 1100 }, hasTouch: false, isMobile: false },
  mobile: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const flagValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const positional = argv.filter((a) => !a.startsWith('--'));

const label = auditOnlyArg(positional) ? 'audit' : positional[0] || 'current';
const wanted = auditOnlyArg(positional) ? positional : positional.slice(1);
function auditOnlyArg(list) {
  return argv.includes('--audit') && list.every((name) => TARGETS.some((t) => t.name === name));
}
const themes = (flagValue('theme') || 'light,dark').split(',');
const device = flags.has('--mobile') ? VIEWPORTS.mobile : VIEWPORTS.desktop;
const viewport = device.viewport;
// A full-page capture paints `position: fixed` chrome once, at the scroll
// position it had — so the header and the mobile bottom nav land in the middle
// of a tall screenshot. `--fold` captures the viewport instead, which is the
// only way to review the chrome where it actually sits.
const foldOnly = flags.has('--fold');
const auditOnly = flags.has('--audit');
const outDir = join(ROOT, '.screenshots', label);

if (flags.has('--help')) {
  console.log(
    'Usage: npm run shots -- <label> [target...] [--theme=light,dark] [--mobile] [--fold]\n\n' +
      'Targets:\n  ' +
      TARGETS.map((t) => t.name).join('\n  ')
  );
  process.exit(0);
}

const selected = wanted.length ? TARGETS.filter((t) => wanted.includes(t.name)) : TARGETS;
const unknown = wanted.filter((name) => !TARGETS.some((t) => t.name === name));
if (unknown.length) {
  console.error(`Unknown target(s): ${unknown.join(', ')}\nRun with --help to list them.`);
  process.exit(1);
}

// ── Session seeding ──────────────────────────────────────────────────────────
const authStorage = JSON.stringify({
  state: {
    user,
    isAuthenticated: true,
    accessToken: 'fixture-access-token',
    refreshToken: 'fixture-refresh-token',
    tokenExpiresAt: Date.now() + 3_600_000,
    expiresIn: 3600,
  },
  version: 0,
});
// The welcome tour is auto-started for users with no flights; mark it seen so
// it never lands on top of the screen being captured.
const onboardingStorage = JSON.stringify({ state: { completedUserIds: [user.id] }, version: 0 });

// ── Dev server ───────────────────────────────────────────────────────────────
async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await reachable(BASE_URL)) return null;
  process.stdout.write(`starting dev server for ${BASE_URL}…\n`);
  const child = spawn('npm', ['run', 'dev'], { cwd: ROOT, stdio: 'ignore', detached: false });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await reachable(BASE_URL)) return child;
  }
  child.kill();
  throw new Error(`dev server did not come up at ${BASE_URL} within 60s`);
}

/**
 * Playwright's bundled Chromium, or the one the environment provides.
 * Some sandboxes ship a browser at a fixed path with a build number that does
 * not match the installed Playwright, which makes the default launch fail.
 */
async function launchBrowser() {
  const explicit = process.env.SHOT_CHROMIUM;
  if (explicit) return chromium.launch({ executablePath: explicit });
  try {
    return await chromium.launch();
  } catch (err) {
    for (const candidate of ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome']) {
      try {
        return await chromium.launch({ executablePath: candidate });
      } catch { /* try the next one */ }
    }
    throw err;
  }
}

// ── Capture ──────────────────────────────────────────────────────────────────
async function shoot(browser, target, theme) {
  const context = await browser.newContext({
    ...device,
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'en-GB',
    // The app pins the clock nowhere, but the fixtures do — keeping the
    // browser's locale fixed is what stops date formats drifting per machine.
    timezoneId: 'Europe/Berlin',
  });

  await context.addInitScript(
    ([auth, onboarding, themeName, anonymous]) => {
      if (!anonymous) {
        localStorage.setItem('auth-storage', auth);
        localStorage.setItem('ninerlog-onboarding', onboarding);
      }
      localStorage.setItem('ninerlog-theme', JSON.stringify({ state: { theme: themeName }, version: 0 }));
      localStorage.setItem('i18nextLng', 'en');
    },
    [authStorage, onboardingStorage, theme, !!target.anonymous]
  );

  await context.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '');
    if (target.fail && FAILING_PATHS.includes(path)) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
    const body = target.empty && path in EMPTY_BODIES ? EMPTY_BODIES[path] : bodyFor(path);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body ?? null),
    });
  });

  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (err) => problems.push(err.message.split('\n')[0]));
  // A render that throws is caught by the app's ErrorBoundary, so it never
  // reaches `pageerror` — the shot would just be a tidy "Something went wrong"
  // card. Read the crash out of the console instead.
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.includes('[ErrorBoundary]') || /TypeError|ReferenceError/.test(text)) {
      problems.push(text.replace(/\s+/g, ' ').slice(0, 160));
    }
  });

  await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  if (target.act) {
    try {
      await target.act(page);
    } catch (err) {
      problems.push(`act failed: ${err.message.split('\n')[0]}`);
    }
  }

  if (auditOnly) {
    const min = device.hasTouch ? TARGET_MIN.touch : TARGET_MIN.pointer;
    const report = await page.evaluate(collectReport, min);
    const { text, clean } = formatReport(target.name, report, { mobile: flags.has('--mobile') });
    console.log(text);
    await context.close();
    return clean ? [] : problems;
  }

  // Freeze animation so two captures of the same screen are byte-comparable.
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(250);

  mkdirSync(outDir, { recursive: true });
  const suffix = foldOnly ? `${theme}.fold` : theme;
  await page.screenshot({ path: join(outDir, `${target.name}.${suffix}.png`), fullPage: !foldOnly });
  await context.close();
  return problems;
}

// ── Run ──────────────────────────────────────────────────────────────────────
let devServer = null;
let failures = 0;
try {
  devServer = await startDevServer();
  const browser = await launchBrowser();
  if (!auditOnly) rmSync(outDir, { recursive: true, force: true });

  for (const target of selected) {
    for (const theme of auditOnly ? ['light'] : themes) {
      const problems = await shoot(browser, target, theme);
      if (!auditOnly) {
        const status = problems.length ? `⚠ ${problems[0]}` : 'ok';
        process.stdout.write(`  ${target.name}.${theme}  ${status}\n`);
      }
      if (problems.length) failures++;
    }
  }

  await browser.close();
  if (auditOnly) {
    console.log(`\n${selected.length} screens audited at ${viewport.width}×${viewport.height}.`);
  } else {
    console.log(`\n${selected.length * themes.length} shots → .screenshots/${label}/`);
    if (failures) console.log(`${failures} shot(s) reported a page error — check them before shipping.`);
  }
} finally {
  devServer?.kill();
}

process.exit(failures ? 1 : 0);
