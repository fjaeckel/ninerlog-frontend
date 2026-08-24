#!/usr/bin/env node
/**
 * Marketing capture — renders the app against the story fixtures
 * (`fixtures-story.mjs`) and produces the feature images and demo clips used
 * by the ninerlog README and ninerlog.com.
 *
 *   node scripts/screenshots/marketing.mjs                     every still, light + dark
 *   node scripts/screenshots/marketing.mjs quick-log fleet     only those
 *   node scripts/screenshots/marketing.mjs --animations        demo videos + GIFs
 *   node scripts/screenshots/marketing.mjs --theme=dark
 *   node scripts/screenshots/marketing.mjs --help              list targets
 *
 * Stills render a 1200×675 viewport at 2× (2400×1350 PNG); `mobile` renders
 * 393×852 at 2×. Animations record a 1200×675 WebM per theme plus a 720px
 * GIF. Output: `.screenshots/marketing/feature-<name>[-dark].png` and
 * `demo-<name>[-dark].{webm,gif}` — basenames match the files served from
 * ninerlog.com/images.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import gifenc from 'gifenc';
import pngjs from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const { PNG } = pngjs;
import { user, bodyFor, flights } from './fixtures-story.mjs';
import { startDevServer, launchBrowser } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const BASE_URL = process.env.SHOT_BASE_URL || 'http://localhost:5173';
const FFMPEG = process.env.SHOT_FFMPEG || '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux';

const DESKTOP = { viewport: { width: 1200, height: 675 }, hasTouch: false, isMobile: false };
const MOBILE = { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true };

// ── Targets ──────────────────────────────────────────────────────────────────

const fillFlightForm = async (page) => {
  await page.getByRole('button', { name: /log flight/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByLabel(/aircraft registration/i).first().fill('NR16020');
  await page.waitForTimeout(400);
  // Picking the fleet suggestion closes the autocomplete.
  await page.getByText(/Lockheed Model 10-E/).first().click().catch(() => {});
  await page.getByLabel(/^departure/i).first().fill('KOAK');
  await page.getByLabel(/^arrival/i).first().fill('KBUR');
  await page.getByLabel(/off-block/i).first().fill('09:15');
  await page.getByLabel(/^takeoff\b/i).first().fill('09:28');
  await page.getByLabel(/^landing\b/i).first().fill('11:31');
  await page.getByLabel(/on-block/i).first().fill('11:40');
  await page.waitForTimeout(400);
};

const clickTab = (name) => async (page) => {
  await page.getByRole('button', { name }).first().click();
  await page.waitForTimeout(600);
};

/**
 * A still is `{ name, path }` plus, optionally:
 *   act(page)  interaction before the shot
 *   device     viewport override (default 1200×675 desktop)
 *   scrollY    pixels to scroll down before the shot
 */
export const STILLS = [
  { name: 'flight-logging', path: '/flights', act: fillFlightForm },
  { name: 'quick-log', path: '/quicklog', plainCopy: 'poster-quicklog' },
  { name: 'search', path: '/flights?q=Atlantic' },
  { name: 'currency-tracking', path: '/currency' },
  { name: 'custom-currency', path: '/currency/builder?rule=ccr1', scrollY: 120 },
  { name: 'credentials', path: '/credentials' },
  { name: 'fleet', path: '/aircraft' },
  { name: 'reports', path: '/reports', plainCopy: 'poster-reports' },
  { name: 'instructor-signing', path: '/flights/f4', scrollY: 500 },
  { name: 'import', path: '/import' },
  { name: 'export', path: '/export' },
  { name: 'cloud-backup', path: '/profile', act: clickTab(/backup/i) },
  { name: 'login-security', path: '/profile', act: clickTab(/^account/i), scrollY: 1200 },
  { name: 'flying-club', path: '/admin', act: clickTab(/^users$/i) },
  { name: 'mobile', path: '/flights', device: MOBILE },
];

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const flagValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const wanted = argv.filter((a) => !a.startsWith('--'));
const themes = (flagValue('theme') || 'light,dark').split(',');
const animationsOnly = flags.has('--animations');
const outDir = join(ROOT, '.screenshots', 'marketing');

if (flags.has('--help')) {
  console.log(
    'Usage: node scripts/screenshots/marketing.mjs [name...] [--theme=light,dark] [--animations]\n\n' +
      'Stills:\n  ' + STILLS.map((t) => t.name).join('\n  ') +
      '\n\nAnimations (with --animations):\n  ' + ['quicklog', 'log-flight', 'reports'].join('\n  ')
  );
  process.exit(0);
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
const onboardingStorage = JSON.stringify({ state: { completedUserIds: [user.id] }, version: 0 });

// ── Framing ──────────────────────────────────────────────────────────────────
// Stills ship with the frame baked in — rounded corners, a hairline border
// and a soft shadow on a transparent margin — so they read as pictures on any
// background (GitHub README, docs, the website) without CSS.
const FRAME = { margin: 64, radius: 20, border: 2 };

let framerPage = null;

async function frameStill(pngBuffer, theme) {
  const out = await framerPage.evaluate(
    async ({ src, margin, radius, border, dark }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width + margin * 2;
      canvas.height = img.height + margin * 2;
      const ctx = canvas.getContext('2d');
      const path = new Path2D();
      path.roundRect(margin, margin, img.width, img.height, radius);
      ctx.save();
      ctx.shadowColor = 'rgba(2, 6, 23, 0.38)';
      ctx.shadowBlur = 44;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#0f172a';
      ctx.fill(path);
      ctx.restore();
      ctx.save();
      ctx.clip(path);
      ctx.drawImage(img, margin, margin);
      ctx.restore();
      ctx.lineWidth = border;
      ctx.strokeStyle = dark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(15, 23, 42, 0.16)';
      ctx.stroke(path);
      return canvas.toDataURL('image/png');
    },
    { src: `data:image/png;base64,${pngBuffer.toString('base64')}`, ...FRAME, dark: theme === 'dark' }
  );
  return Buffer.from(out.split(',')[1], 'base64');
}

// ── Signature image ──────────────────────────────────────────────────────────
let signaturePngBuffer = null;

/** Draws Neta Snook's signature on a canvas and keeps the PNG bytes. */
async function renderSignature(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 560;
    c.height = 170;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.save();
    ctx.translate(40, 108);
    ctx.rotate(-0.06);
    ctx.font = 'italic 400 64px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive';
    ctx.fillText('Neta Snook', 0, 0);
    ctx.restore();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(36, 132);
    ctx.bezierCurveTo(170, 152, 360, 112, 500, 134);
    ctx.stroke();
    return c.toDataURL('image/png');
  });
  await context.close();
  signaturePngBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
}

// ── Contexts ─────────────────────────────────────────────────────────────────

/**
 * Answers `/api/v1/**` from the story fixtures. `overrides(info)` may return
 * a body (or a promise of one) to take precedence; `undefined` falls through.
 */
function routeHandler(overrides) {
  return async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');

    if (/^\/flights\/[^/]+\/signatures\/[^/]+\/image$/.test(path)) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: signaturePngBuffer });
    }

    let body;
    if (overrides) {
      body = await overrides({ path, method: request.method(), postData: request.postData() });
    }
    if (body === undefined) body = bodyFor(path, url.searchParams);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body ?? null),
    });
  };
}

async function makeContext(browser, { theme, device = DESKTOP, video = null, overrides = null, geolocation = null }) {
  const context = await browser.newContext({
    ...device,
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'en-GB',
    timezoneId: 'Europe/Berlin',
    ...(video ? { recordVideo: { dir: video, size: device.viewport } } : {}),
    ...(geolocation ? { geolocation, permissions: ['geolocation'] } : {}),
  });
  await context.addInitScript(
    ([auth, onboarding, themeName]) => {
      localStorage.setItem('auth-storage', auth);
      localStorage.setItem('ninerlog-onboarding', onboarding);
      localStorage.setItem('ninerlog-theme', JSON.stringify({ state: { theme: themeName }, version: 0 }));
      localStorage.setItem('ninerlog-language', 'en');
    },
    [authStorage, onboardingStorage, theme]
  );
  await context.route('**/api/v1/**', routeHandler(overrides));
  return context;
}

// ── Stills ───────────────────────────────────────────────────────────────────
async function shootStill(browser, target, theme) {
  const context = await makeContext(browser, { theme, device: target.device });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (err) => problems.push(err.message.split('\n')[0]));

  await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (target.act) {
    try {
      await target.act(page);
    } catch (err) {
      problems.push(`act failed: ${err.message.split('\n')[0]}`);
    }
  }
  if (target.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), target.scrollY);
    await page.waitForTimeout(300);
  }

  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(250);

  const suffix = theme === 'dark' ? '-dark' : '';
  const raw = await page.screenshot({ fullPage: false });
  writeFileSync(join(outDir, `feature-${target.name}${suffix}.png`), await frameStill(raw, theme));
  // Video posters must match the unframed video, so keep a plain copy too.
  if (target.plainCopy) writeFileSync(join(outDir, `${target.plainCopy}${suffix}.png`), raw);
  await context.close();
  return problems;
}

// ── Animations ───────────────────────────────────────────────────────────────

/** Stateful Quick Log backend: taps build a session; on block completes it. */
function quicklogOverrides() {
  let session = null;
  const stamp = { offblock: 'offBlockAt', takeoff: 'takeoffAt', landing: 'landingAt', onblock: 'onBlockAt' };
  return ({ path, method, postData }) => {
    if (path === '/flight-sessions/current' && method === 'GET') return session;
    if (path === '/flight-sessions/current/events' && method === 'POST') {
      const event = JSON.parse(postData ?? '{}');
      const now = new Date().toISOString();
      session ??= {
        id: 'fs-demo', userId: 'u1', status: 'open',
        aircraftReg: null, departureIcao: null, arrivalIcao: null,
        offBlockAt: null, takeoffAt: null, landingAt: null, onBlockAt: null,
        flightId: null, createdAt: now, updatedAt: now,
      };
      session[stamp[event.type]] = event.occurredAt ?? now;
      session.updatedAt = now;
      if (event.aircraftReg) session.aircraftReg = event.aircraftReg;
      if (event.type === 'offblock' || event.type === 'takeoff') session.departureIcao ??= 'KOAK';
      if (event.type === 'landing' || event.type === 'onblock') session.arrivalIcao ??= 'KOAK';
      if (event.type === 'onblock') {
        session.status = 'completed';
        session.flightId = 'f9';
      }
      return session;
    }
    return undefined;
  };
}

/** Flight creation that shows up in the list on the refetch. */
function logFlightOverrides() {
  const created = [];
  return ({ path, method, postData }) => {
    if (path === '/flights' && method === 'POST') {
      const body = JSON.parse(postData ?? '{}');
      const flight = {
        ...flights[0],
        id: 'f-created',
        date: body.date ?? flights[0].date,
        aircraftReg: body.aircraftReg ?? 'NR16020',
        aircraftType: 'L10E',
        departureIcao: 'KOAK',
        arrivalIcao: 'KBUR',
        offBlockTime: body.offBlockTime ?? '09:15',
        onBlockTime: body.onBlockTime ?? '11:40',
        departureTime: body.departureTime ?? null,
        arrivalTime: body.arrivalTime ?? null,
        totalTime: 145, picTime: 145, isPic: true, nightTime: 0, ifrTime: 0,
        landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
        crossCountryTime: 145, distance: 283, crewMembers: [],
        remarks: 'Ferry to Burbank — engine run-in.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      created.unshift(flight);
      return flight;
    }
    if (path === '/flights' && method === 'GET') {
      const data = [...created, ...flights];
      return { data, pagination: { page: 1, pageSize: 25, total: data.length, totalPages: 1 } };
    }
    return undefined;
  };
}

const tap = async (page, label, settle = 2600) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(settle);
};

export const ANIMATIONS = [
  {
    name: 'quicklog',
    path: '/quicklog',
    overrides: quicklogOverrides,
    geolocation: { latitude: 37.721, longitude: -122.221 },
    run: async (page) => {
      await page.waitForTimeout(1600);
      await page.locator('#quicklog-aircraft').selectOption('NC7952');
      await page.waitForTimeout(1400);
      await tap(page, 'OFF BLOCK');
      await tap(page, 'TAKEOFF', 3000);
      await tap(page, 'LANDING', 2600);
      await tap(page, 'ON BLOCK', 3200);
    },
  },
  {
    name: 'log-flight',
    path: '/flights',
    overrides: logFlightOverrides,
    run: async (page) => {
      await page.waitForTimeout(1600);
      await page.getByRole('button', { name: /log flight/i }).first().click();
      await page.waitForTimeout(1000);
      const type = async (label, text) => {
        const field = page.getByLabel(label).first();
        await field.click();
        await field.fill('');
        await field.pressSequentially(text, { delay: 70 });
        await page.waitForTimeout(350);
      };
      await type(/aircraft registration/i, 'NR16020');
      await type(/^departure/i, 'KOAK');
      await type(/^arrival/i, 'KBUR');
      await page.getByLabel(/off-block/i).first().fill('09:15');
      await page.waitForTimeout(350);
      await page.getByLabel(/on-block/i).first().fill('11:40');
      await page.waitForTimeout(700);
      const save = page.locator('button[type="submit"]').filter({ hasText: /log flight/i }).first();
      await save.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      await save.click();
      await page.waitForTimeout(2800);
    },
  },
  {
    name: 'reports',
    path: '/reports',
    run: async (page) => {
      await page.waitForTimeout(2400);
      for (const id of ['experience', 'aircraft', 'places', 'patterns', 'records']) {
        await page.evaluate((section) => {
          document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, id);
        await page.waitForTimeout(2200);
      }
    },
  },
];

function ffmpeg(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

/** webm frames → 720px GIF at 8 fps via gifenc. */
function webmToGif(webmPath, gifPath) {
  const frameDir = mkdtempSync(join(tmpdir(), 'ninerlog-gif-'));
  try {
    ffmpeg(['-i', webmPath, '-vf', 'scale=720:-2', '-r', '8', join(frameDir, '%04d.png')]);
    const frames = readdirSync(frameDir).filter((f) => f.endsWith('.png')).sort();
    if (!frames.length) throw new Error('no frames extracted');
    const gif = GIFEncoder();
    for (const frame of frames) {
      const png = PNG.sync.read(readFileSync(join(frameDir, frame)));
      const palette = quantize(png.data, 256);
      const index = applyPalette(png.data, palette);
      gif.writeFrame(index, png.width, png.height, { palette, delay: 125 });
    }
    gif.finish();
    writeFileSync(gifPath, Buffer.from(gif.bytes()));
  } finally {
    rmSync(frameDir, { recursive: true, force: true });
  }
}

async function recordAnimation(browser, spec, theme) {
  // Warm-up pass so the dev server has compiled the route before recording.
  const warmup = await makeContext(browser, { theme });
  const warmupPage = await warmup.newPage();
  await warmupPage.goto(`${BASE_URL}${spec.path}`, { waitUntil: 'networkidle' });
  await warmup.close();

  const videoDir = mkdtempSync(join(tmpdir(), 'ninerlog-video-'));
  const context = await makeContext(browser, {
    theme,
    video: videoDir,
    overrides: spec.overrides ? spec.overrides() : null,
    geolocation: spec.geolocation ?? null,
  });
  const recordingStart = Date.now();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${spec.path}`, { waitUntil: 'networkidle' });
  // Everything up to here is load time; it is cut from the clip below.
  const leadSeconds = Math.max(0.5, (Date.now() - recordingStart) / 1000 - 0.4);
  await spec.run(page);
  await context.close();

  const rawWebm = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
  if (!rawWebm) throw new Error(`no video recorded for ${spec.name}`);
  const suffix = theme === 'dark' ? '-dark' : '';
  const outWebm = join(outDir, `demo-${spec.name}${suffix}.webm`);
  // Trim the page-load lead and cap the bitrate.
  ffmpeg(['-ss', leadSeconds.toFixed(1), '-i', join(videoDir, rawWebm), '-c:v', 'libvpx', '-b:v', '1.2M', '-crf', '14', '-auto-alt-ref', '0', outWebm]);
  webmToGif(outWebm, join(outDir, `demo-${spec.name}${suffix}.gif`));
  rmSync(videoDir, { recursive: true, force: true });
}

// ── Run ──────────────────────────────────────────────────────────────────────
const stills = animationsOnly ? [] : (wanted.length ? STILLS.filter((t) => wanted.includes(t.name)) : STILLS);
const animations = animationsOnly ? (wanted.length ? ANIMATIONS.filter((a) => wanted.includes(a.name)) : ANIMATIONS) : [];
const unknown = wanted.filter((name) => ![...STILLS, ...ANIMATIONS].some((t) => t.name === name));
if (unknown.length) {
  console.error(`Unknown target(s): ${unknown.join(', ')}\nRun with --help to list them.`);
  process.exit(1);
}

let devServer = null;
let failures = 0;
try {
  devServer = await startDevServer(ROOT, BASE_URL);
  const browser = await launchBrowser({ args: ['--lang=en-GB'] });
  mkdirSync(outDir, { recursive: true });
  await renderSignature(browser);
  framerPage = await (await browser.newContext()).newPage();

  for (const target of stills) {
    for (const theme of themes) {
      const problems = await shootStill(browser, target, theme);
      const status = problems.length ? `⚠ ${problems[0]}` : 'ok';
      process.stdout.write(`  feature-${target.name}${theme === 'dark' ? '-dark' : ''}.png  ${status}\n`);
      if (problems.length) failures++;
    }
  }

  for (const spec of animations) {
    for (const theme of themes) {
      await recordAnimation(browser, spec, theme);
      process.stdout.write(`  demo-${spec.name}${theme === 'dark' ? '-dark' : ''}.{webm,gif}  ok\n`);
    }
  }

  await browser.close();
  console.log(`\noutput → .screenshots/marketing/`);
  if (failures) console.log(`${failures} still(s) reported a problem — check them before shipping.`);
} finally {
  devServer?.kill();
}

process.exit(failures ? 1 : 0);
