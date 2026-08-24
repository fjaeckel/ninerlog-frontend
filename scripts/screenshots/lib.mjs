/** Shared plumbing for the capture scripts: dev server and browser startup. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

export async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

/** Starts `npm run dev` when nothing listens on the base URL. */
export async function startDevServer(rootDir, baseUrl) {
  if (await reachable(baseUrl)) return null;
  process.stdout.write(`starting dev server for ${baseUrl}…\n`);
  const child = spawn('npm', ['run', 'dev'], { cwd: rootDir, stdio: 'ignore', detached: false });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await reachable(baseUrl)) return child;
  }
  child.kill();
  throw new Error(`dev server did not come up at ${baseUrl} within 60s`);
}

/** Playwright's bundled Chromium, or the one the environment provides. */
export async function launchBrowser(options = {}) {
  const explicit = process.env.SHOT_CHROMIUM;
  if (explicit) return chromium.launch({ ...options, executablePath: explicit });
  try {
    return await chromium.launch(options);
  } catch (err) {
    for (const candidate of ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome']) {
      try {
        return await chromium.launch({ ...options, executablePath: candidate });
      } catch { /* try the next one */ }
    }
    throw err;
  }
}
