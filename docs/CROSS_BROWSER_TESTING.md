# Cross-browser E2E testing

The per-PR gate stays **chromium-only**. The browser matrix is expensive — the
e2e suite is `fullyParallel: false`, so each extra browser adds roughly a full
suite runtime — and it is wired to run **on demand only**: from the CLI, or via
the `Cross-Browser E2E` workflow's *Run workflow* button. Nothing about it is
attached to push, pull_request or merge.

## Running it

```bash
# Default matrix: chromium + webkit + msedge (needs the API stack running)
npm run test:e2e:cross

# Pick browsers
scripts/run-cross-browser-e2e.sh webkit
scripts/run-cross-browser-e2e.sh chromium webkit firefox

# Capability probe only — no API, no MailPit, ~15s per browser
npm run test:e2e:compat

# Bring the whole stack up first, then run and tear down
scripts/run-cross-browser-e2e.sh --docker webkit msedge

# Everything in Docker (builds branded Chrome/Edge into the image)
E2E_BROWSERS=chromium,webkit,msedge \
  docker compose -f docker-compose.test.yml --profile e2e-cross up --build \
    --abort-on-container-exit --exit-code-from frontend-e2e-cross
```

Plain Playwright works too — the selection is honoured from either side:

```bash
npx playwright test --project=webkit
E2E_BROWSERS=webkit,msedge npx playwright test
```

With no selection at all you get `chromium` alone, which is what keeps
`npm run test:e2e` and the existing CI job cheap.

## Available projects

| Project | Engine | Install |
|---|---|---|
| `chromium` | Blink (bundled) | `npx playwright install chromium` |
| `chrome` | Blink, **branded** Google Chrome | `npx playwright install chrome` |
| `msedge` | Blink, **branded** Microsoft Edge | `npx playwright install msedge` |
| `webkit` | WebKit (bundled) | `npx playwright install webkit` |
| `firefox` | Gecko (bundled) | `npx playwright install firefox` |
| `mobile-chrome` | Blink, Pixel 5 viewport | with `chromium` |
| `mobile-safari` | WebKit, iPhone 15 viewport | with `webkit` |

### Playwright cannot drive Safari.app

`webkit` is Playwright's own WebKit build. It is the same engine Safari uses, so
it catches the class of bugs that actually bite — layout, CSS support, JS engine
and `Intl`/date differences. It does **not** reproduce Safari-application
behaviour: ITP cookie eviction, the platform authenticator, Safari's extension
model, or Apple's Smart App Banner. Genuine Safari coverage needs a macOS host
and `safaridriver`, which is out of scope here.

`chrome` and `msedge` are both Blink, so they rarely diverge from `chromium`.
They are worth running before a release for channel-level differences (codecs,
enterprise policy, Edge's UI surface), not on every matrix run.

## The capability matrix

`src/__tests__/e2e/browser-compat.spec.ts` needs no API. It loads the app shell
and probes the browser features NinerLog actually depends on, each annotated
with the source file that relies on it. Probes marked `required` fail the run
when unsupported; the rest are reported but tolerated.

Results are written per browser to `test-results/browser-compat/<project>.json`
and merged into a table:

```bash
node scripts/browser-compat-matrix.mjs             # terminal table
node scripts/browser-compat-matrix.mjs --markdown  # job summary
```

The merged output flags any capability whose support differs between browsers,
which is the fastest way to answer "is this feature consistent everywhere?".

## Known per-browser divergences

These are properties of the code and the tooling, not of any particular run:

- **Passkeys / WebAuthn are Chromium-only in e2e.** `passkeys.spec.ts` installs a
  virtual authenticator over the Chrome DevTools Protocol
  (`newCDPSession`), which WebKit and Firefox do not speak. The spec now skips
  itself with an explicit reason on non-Chromium projects — passkey support in
  Safari and Firefox has to be verified by hand.
- **The insecure-origin escape hatch is Chromium-only.** The e2e stack serves
  the app over plain HTTP on `app.ninerlog.test`, which is not a secure context.
  Chromium is launched with
  `--unsafely-treat-insecure-origin-as-secure` so `window.PublicKeyCredential`
  is exposed; WebKit and Firefox have no equivalent switch, so anything gated on
  a secure context stays unavailable there until the e2e dev server serves
  HTTPS ([issue #46](https://github.com/fjaeckel/ninerlog-frontend/issues/46)).
- **Clipboard writes.** `navigator.clipboard.writeText` (share links in
  `ShareRuleModal`, `SignatureSection`, `CustomCurrencyBuilderPage`) is
  permission-gated. Playwright can pre-grant `clipboard-write` only on
  Chromium; on WebKit and Firefox a copy has to happen inside a real user
  gesture, so assert on the UI feedback rather than reading the clipboard back.
- **`backdrop-filter`** already has an `@supports` fallback in
  `src/index.css:349`, so a missing-support result there is expected and not a
  regression.

## Interpreting a run

A spec that is red in one project and green in another is a genuine
cross-browser inconsistency — that is the signal this suite exists to produce.
The HTML report groups results by project:

```bash
npx playwright show-report
```

The runner deliberately does not stop at the first red browser; every selected
browser runs so one report covers the whole matrix.
