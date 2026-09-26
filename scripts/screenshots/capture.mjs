#!/usr/bin/env node
/**
 * Screenshot harness — renders the real app against fixture data and captures
 * every screen in light and dark.
 *
 *   npm run shots -- before                    every target, light + dark
 *   npm run shots -- after flights aircraft    only those targets
 *   npm run shots -- after --mobile            iPhone-sized viewport
 *   npm run shots -- after --mobile --fold     just the first screen, chrome in place
 *   npm run shots -- after --theme=dark        one theme
 *   npm run shots -- --audit [--mobile]        measure instead of capture
 *   npm run shots -- after --persona=lena      a persona's fixture set (PERSONAS.md)
 *   npm run shots -- after --persona=all       every persona in turn
 *
 * Output goes to `.screenshots/<label>/<target>.<theme>.png` (gitignored);
 * a persona run writes `.screenshots/<label>/<persona>/<target>.<theme>.png`.
 * `SHOT_PERSONA=<id|all|id,id>` is the same as `--persona=`.
 * Capture `before` on the current main, make the change, capture `after`, and
 * compare the pairs.
 *
 * No API is needed: `page.route` answers every `/api/v1/**` call from
 * `fixtures.mjs`. The dev server is started automatically when one is not
 * already listening on the base URL.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as defaultFixtures from './fixtures.mjs';
import { TARGETS, PERSONA_TARGETS, FAILING_PATHS, EMPTY_BODIES } from './targets.mjs';
import { PERSONA_IDS, loadPersona } from './personas/index.mjs';
import { collectReport, formatReport, TARGET_MIN } from './audit.mjs';
import { startDevServer, launchBrowser } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const BASE_URL = process.env.SHOT_BASE_URL || 'http://localhost:5173';
// UI language for the shots; set SHOT_LANG=de to review the German locale.
const LANG = process.env.SHOT_LANG || 'en';

// hasTouch/isMobile make `(pointer: coarse)` and `(hover: none)` match.
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
// `--fold` captures the viewport instead of the full page, keeping fixed
// chrome where it sits.
const foldOnly = flags.has('--fold');
const auditOnly = flags.has('--audit');
const personaArg = flagValue('persona') || process.env.SHOT_PERSONA || '';
const personas = personaArg === 'all' ? PERSONA_IDS : personaArg.split(',').filter(Boolean);

if (flags.has('--help')) {
  console.log(
    'Usage: npm run shots -- <label> [target...] [--theme=light,dark] [--mobile] [--fold] [--persona=<id|all>]\n\n' +
      `Personas: ${PERSONA_IDS.join(', ')}, all\n` +
      `Persona default targets: ${PERSONA_TARGETS.join(', ')}\n\n` +
      'Targets:\n  ' +
      TARGETS.map((t) => t.name + (t.personaOnly ? '  (persona runs)' : '')).join('\n  ')
  );
  process.exit(0);
}

const unknownPersonas = personas.filter((id) => !PERSONA_IDS.includes(id));
if (unknownPersonas.length) {
  console.error(`Unknown persona(s): ${unknownPersonas.join(', ')}\nKnown: ${PERSONA_IDS.join(', ')}, all`);
  process.exit(1);
}

const defaultTargets = personas.length
  ? TARGETS.filter((t) => PERSONA_TARGETS.includes(t.name))
  : TARGETS.filter((t) => !t.personaOnly);
const selected = wanted.length ? TARGETS.filter((t) => wanted.includes(t.name)) : defaultTargets;
const unknown = wanted.filter((name) => !TARGETS.some((t) => t.name === name));
if (unknown.length) {
  console.error(`Unknown target(s): ${unknown.join(', ')}\nRun with --help to list them.`);
  process.exit(1);
}

// ── Session seeding ──────────────────────────────────────────────────────────
function sessionStorageFor(user) {
  return {
    authStorage: JSON.stringify({
      state: {
        user,
        isAuthenticated: true,
        accessToken: 'fixture-access-token',
        refreshToken: 'fixture-refresh-token',
        tokenExpiresAt: Date.now() + 3_600_000,
        expiresIn: 3600,
      },
      version: 0,
    }),
    // Mark the welcome tour seen.
    onboardingStorage: JSON.stringify({ state: { completedUserIds: [user.id] }, version: 0 }),
  };
}

// ── Capture ──────────────────────────────────────────────────────────────────
async function shoot(browser, target, theme, fx, outDir) {
  const { authStorage, onboardingStorage } = sessionStorageFor(fx.user);
  const context = await browser.newContext({
    ...device,
    deviceScaleFactor: 2,
    colorScheme: theme,
    // Native date/time inputs render in the *browser's* locale, not the app's,
    // so this has to follow SHOT_LANG or a German capture shows US date pickers.
    // Still fixed per language, which is what stops formats drifting per machine.
    locale: LANG === 'de' ? 'de-DE' : 'en-GB',
    timezoneId: 'Europe/Berlin',
  });

  await context.addInitScript(
    ([auth, onboarding, themeName, anonymous, lang]) => {
      if (!anonymous) {
        localStorage.setItem('auth-storage', auth);
        localStorage.setItem('ninerlog-onboarding', onboarding);
      }
      localStorage.setItem('ninerlog-theme', JSON.stringify({ state: { theme: themeName }, version: 0 }));
      localStorage.setItem('ninerlog-language', lang);
    },
    [authStorage, onboardingStorage, theme, !!target.anonymous, LANG]
  );

  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (target.fail && FAILING_PATHS.includes(path)) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
    const body = target.empty && path in EMPTY_BODIES ? EMPTY_BODIES[path] : fx.bodyFor(path, url.searchParams);
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
      await target.act(page, fx);
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
  devServer = await startDevServer(ROOT, BASE_URL);
  const browser = await launchBrowser();
  let shots = 0;

  for (const persona of personas.length ? personas : [null]) {
    const fx = persona ? await loadPersona(persona) : { ...defaultFixtures, shotAircraft: [] };
    const outDir = persona ? join(ROOT, '.screenshots', label, persona) : join(ROOT, '.screenshots', label);
    if (!auditOnly) rmSync(outDir, { recursive: true, force: true });
    if (persona) {
      process.stdout.write(`${persona}\n`);
      for (const m of fx.profileMismatches) process.stdout.write(`  ! pilot profile ${m}\n`);
    }

    for (const target of selected) {
      if (target.skip?.(fx)) {
        if (!auditOnly) process.stdout.write(`  ${target.name}  skipped (not applicable)\n`);
        continue;
      }
      for (const theme of auditOnly ? ['light'] : themes) {
        const problems = await shoot(browser, target, theme, fx, outDir);
        shots++;
        if (!auditOnly) {
          const status = problems.length ? `⚠ ${problems[0]}` : 'ok';
          process.stdout.write(`  ${target.name}.${theme}  ${status}\n`);
        }
        if (problems.length) failures++;
      }
    }
  }

  await browser.close();
  if (auditOnly) {
    console.log(`\n${selected.length} screens audited at ${viewport.width}×${viewport.height}.`);
  } else {
    console.log(`\n${shots} shots → .screenshots/${label}/`);
    if (failures) console.log(`${failures} shot(s) reported a page error — check them before shipping.`);
  }
} finally {
  devServer?.kill();
}

process.exit(failures ? 1 : 0);
