---
name: testing
description: How NinerLog frontend tests are written and run — Vitest + React Testing Library unit tests, Playwright E2E against a real API with MailPit, and the Docker test stack. Load when writing a test, debugging a failing or flaky test, or running the pre-push gate.
---

# Testing

## Commands

```bash
npx vitest run                 # unit tests, single run (what CI runs)
npm test                       # watch mode
npx vitest run FlightForm      # single file / name filter
npx vitest run --coverage
npm run test:ui                # Vitest UI

npm run test:e2e               # Playwright (needs a live backend — see below)
npx playwright test flights.spec.ts
npm run test:e2e -- --headed   # or --debug, or npm run test:e2e:ui
npx playwright show-report     # after a run; failures land in test-results/

npm run type-check && npm run lint
```

Pre-push gate: `npx vitest run && npm run type-check && npm run lint`, plus the E2E suite when behavior changed.

## Unit tests — mock at the hook boundary

`src/__tests__/**/*.test.tsx`, Vitest + RTL on happy-dom. Despite `msw` sitting in devDependencies and being mentioned in `docs/TESTING.md`, **there is no MSW server in `src/`** — tests replace the data hooks instead:

```tsx
vi.mock('../../hooks/useFlights', () => ({
  useCreateFlight: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
// or, to keep the rest of the module intact:
vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({ data, isLoading: false } as any);
```

Render with the providers the component expects:

```tsx
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};
```

`src/test/setup.ts` initializes real i18n (so `t()` returns **English** strings — assert against those, not against keys) and patches a broken Node 25+ `globalThis.localStorage` that happy-dom reuses and Zustand's `persist` chokes on.

Test user-visible behavior: roles, labels, text, error and loading states, edge cases. Not state variable names or internal functions. Leaflet and other browser-heavy libs are `vi.mock`ed (see `src/__tests__/maps/MapPage.test.tsx`).

## E2E tests — real API, no mocks

`src/__tests__/e2e/`, Playwright, `fullyParallel: false`. Each spec registers a **unique user** (`uniqueEmail()`), then polls **MailPit** for the verification email and extracts the token from it — so the suite needs Postgres + API + MailPit running, not just a dev server. `PLAYWRIGHT_MAILPIT_URL` overrides the default in-Docker `http://mailpit-test:8025`.

Practical ways to run it:

```bash
# Everything in Docker (recommended)
docker compose -f docker-compose.test.yml --profile e2e up --build --abort-on-container-exit
bash scripts/run-all-tests.sh              # unit + e2e; --skip-e2e for unit only

# Against a locally running backend
cd ../ninerlog-api && make run             # terminal 1
npm run test:e2e                           # terminal 2 (Playwright auto-starts npm run dev)
```

Locally Playwright starts `npm run dev` itself (`reuseExistingServer`); under `CI=1` it does not — the `frontend-dev` container serves the app. Chromium launches with `--unsafely-treat-insecure-origin-as-secure` for the in-Docker origins so WebAuthn/passkey tests get `window.PublicKeyCredential`. `E2E_MOBILE=1` adds a Pixel 5 project.

## Cross-browser runs — on demand only

Default runs are **chromium-only**; nothing browser-matrix related is attached to push/PR/merge. Opt in with `E2E_BROWSERS` or `--project`:

```bash
npm run test:e2e:cross                        # chromium + webkit + msedge
npm run test:e2e:compat                       # capability probe only, no API needed
scripts/run-cross-browser-e2e.sh --docker webkit
npx playwright test --project=webkit
```

Projects: `chromium`, `chrome`, `msedge`, `webkit`, `firefox`, `mobile-chrome`, `mobile-safari`. `webkit` is Playwright's WebKit build — the Safari *engine*, not Safari.app. Passkey specs skip on non-Chromium (the virtual authenticator is CDP-only). `src/__tests__/e2e/browser-compat.spec.ts` probes the browser features the app depends on and `scripts/browser-compat-matrix.mjs` merges the per-browser JSON into a support table.

Full detail, including known per-browser divergences: `docs/CROSS_BROWSER_TESTING.md`.

Use `helpers.ts` (`uniqueEmail`, registration/login, onboarding-tour dismissal) rather than re-rolling setup — the first-run tour will otherwise intercept clicks.

Unit tests in Docker: `docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit`.

## When tests fail

Fix the cause, not the symptom. If a change surfaces a regression, **file a GitHub issue** — never work around it in the test, never skip it, never mark work complete on a red run.
