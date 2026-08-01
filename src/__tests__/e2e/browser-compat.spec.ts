import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Cross-browser capability matrix.
 *
 * Unlike the rest of the e2e suite this spec needs **no API** — it loads the
 * app shell and probes the browser features NinerLog actually depends on, so
 * it can answer "what breaks in which browser" on its own.
 *
 * Each probe points at the source that relies on it. Probes marked
 * `required: true` fail the run when unsupported; the rest are reported into
 * the matrix but tolerated, either because the code already has a fallback or
 * because the capability is gated on a secure context the e2e stack does not
 * provide.
 *
 * Results are written to test-results/browser-compat/<project>.json and
 * merged into a table by scripts/run-cross-browser-e2e.sh.
 */

interface Probe {
  id: string;
  /** What breaks for a user when this is unsupported. */
  feature: string;
  /** Source that depends on it. */
  usedBy: string;
  required: boolean;
}

const PROBES: Probe[] = [
  { id: 'localStorage', feature: 'Session persistence / onboarding state', usedBy: 'zustand persist (auth-storage)', required: true },
  { id: 'structuredClone', feature: 'Query cache cloning', usedBy: 'TanStack Query', required: true },
  { id: 'intersectionObserver', feature: 'Lazy-loaded route chunks', usedBy: 'React.lazy call sites', required: true },
  { id: 'resizeObserver', feature: 'Responsive charts', usedBy: 'recharts (src/components/reports/charts.tsx)', required: true },
  { id: 'intlDisplayNames', feature: 'Country names in reports', usedBy: 'src/pages/reports/ReportsPage.tsx:821', required: true },
  { id: 'intlDateTimeDe', feature: 'German date formatting', usedBy: 'src/lib/dateFormat.ts', required: true },
  { id: 'createObjectURL', feature: 'CSV/PDF export download', usedBy: 'src/hooks/useExport.ts:11, src/lib/exportReports.ts:32', required: true },
  { id: 'anchorDownloadAttr', feature: 'CSV/PDF export download', usedBy: 'src/hooks/useExport.ts:14, src/lib/exportReports.ts:35', required: true },
  { id: 'localMidnightDateParse', feature: 'Flight weekday label (no off-by-one day)', usedBy: 'src/components/flights/FlightCard.tsx:57', required: true },
  { id: 'fileConstructor', feature: 'JSON/CSV import', usedBy: 'import flows', required: true },
  { id: 'cssHas', feature: ':has() selectors', usedBy: 'src/index.css', required: false },
  { id: 'cssContainerQueries', feature: 'Flights table optional columns', usedBy: 'src/pages/flights/FlightsPage.tsx:632', required: true },
  { id: 'cssBackdropFilter', feature: 'Frosted overlays (has @supports fallback)', usedBy: 'src/index.css:349', required: false },
  { id: 'cssSafeAreaInsets', feature: 'Notch-safe padding', usedBy: 'src/index.css:178', required: false },
  { id: 'clipboardWriteText', feature: 'Copy share link (currency rules, signature)', usedBy: 'src/components/currency/ShareRuleModal.tsx:27', required: false },
  { id: 'publicKeyCredential', feature: 'Passkey registration / login', usedBy: 'src/components/auth/PasskeySection.tsx', required: false },
];

test.describe('Browser capability matrix', () => {
  test('probe the browser features NinerLog depends on', async ({ page }, testInfo) => {
    await page.goto('/login');
    await expect(page.locator('#root')).not.toBeEmpty();

    const results = await page.evaluate(() => {
      const supports = (prop: string, value: string) =>
        typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(prop, value);

      const selectorSupported = (selector: string) => {
        try {
          document.querySelector(selector);
          return true;
        } catch {
          return false;
        }
      };

      const containerQueriesSupported = () => {
        try {
          return supports('container-type', 'inline-size');
        } catch {
          return false;
        }
      };

      const localStorageWritable = () => {
        try {
          localStorage.setItem('__compat_probe__', '1');
          const ok = localStorage.getItem('__compat_probe__') === '1';
          localStorage.removeItem('__compat_probe__');
          return ok;
        } catch {
          return false;
        }
      };

      const objectUrlWorks = () => {
        try {
          const url = URL.createObjectURL(new Blob(['x'], { type: 'text/plain' }));
          URL.revokeObjectURL(url);
          return url.startsWith('blob:');
        } catch {
          return false;
        }
      };

      // FlightCard builds `${date}T00:00:00` so the weekday renders in local
      // time rather than shifting a day in negative UTC offsets.
      const localMidnightParse = () => {
        const d = new Date('2026-01-15T00:00:00');
        return !Number.isNaN(d.getTime()) && d.getDate() === 15 && d.getHours() === 0;
      };

      const intlDisplayNames = () => {
        try {
          return new Intl.DisplayNames(['en'], { type: 'region' }).of('DE') === 'Germany';
        } catch {
          return false;
        }
      };

      const intlDateTimeDe = () => {
        try {
          return new Date(Date.UTC(2026, 0, 15)).toLocaleDateString('de-DE', { timeZone: 'UTC' }) === '15.1.2026';
        } catch {
          return false;
        }
      };

      return {
        localStorage: localStorageWritable(),
        structuredClone: typeof structuredClone === 'function',
        intersectionObserver: typeof IntersectionObserver === 'function',
        resizeObserver: typeof ResizeObserver === 'function',
        intlDisplayNames: intlDisplayNames(),
        intlDateTimeDe: intlDateTimeDe(),
        createObjectURL: objectUrlWorks(),
        anchorDownloadAttr: 'download' in document.createElement('a'),
        localMidnightDateParse: localMidnightParse(),
        fileConstructor: typeof File === 'function',
        cssHas: selectorSupported('div:has(> span)'),
        cssContainerQueries: containerQueriesSupported(),
        cssBackdropFilter: supports('backdrop-filter', 'blur(12px)') || supports('-webkit-backdrop-filter', 'blur(12px)'),
        cssSafeAreaInsets: supports('padding-bottom', 'env(safe-area-inset-bottom)'),
        clipboardWriteText: typeof navigator.clipboard?.writeText === 'function',
        publicKeyCredential: typeof (window as unknown as { PublicKeyCredential?: unknown }).PublicKeyCredential === 'function',
      } as Record<string, boolean>;
    });

    const rows = PROBES.map((probe) => ({ ...probe, supported: results[probe.id] === true }));

    const outDir = path.join(process.cwd(), 'test-results', 'browser-compat');
    await mkdir(outDir, { recursive: true });
    await writeFile(
      path.join(outDir, `${testInfo.project.name}.json`),
      JSON.stringify(
        { project: testInfo.project.name, baseURL: testInfo.project.use.baseURL, probes: rows },
        null,
        2,
      ),
    );

    await testInfo.attach('capability-matrix', {
      body: JSON.stringify(rows, null, 2),
      contentType: 'application/json',
    });

    const unsupported = rows.filter((r) => !r.supported);
    if (unsupported.length) {
      // Surfaces in the `list` reporter so a CLI run shows the gaps inline.
      console.log(
        `\n[${testInfo.project.name}] unsupported: ` +
          unsupported.map((r) => `${r.id}${r.required ? ' (REQUIRED)' : ''}`).join(', '),
      );
    }

    const missingRequired = unsupported.filter((r) => r.required);
    expect(
      missingRequired.map((r) => `${r.id} — breaks: ${r.feature} (${r.usedBy})`),
      `${testInfo.project.name} is missing capabilities NinerLog requires`,
    ).toEqual([]);
  });
});
