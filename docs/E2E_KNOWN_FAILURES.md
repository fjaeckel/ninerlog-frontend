# E2E known failures

Living record of what is red in the Playwright suite, why, and what fixes it.
One entry per distinct root cause — not per failing test, because a single cause
usually takes several tests with it.

`docs/CROSS_BROWSER_TESTING.md` explains how to *run* the matrix. This file
records what the runs *found*.

## Last full run

| | |
|---|---|
| Date | 2026-08-03 |
| Branch | `fix/e2e-cross-browser-failures` (from `42ae032`) |
| Browsers | `chromium`, `webkit` (Playwright 1.62.0, bundled builds, Linux/noble) |
| Stack | `docker-compose.test.yml --profile e2e` (Postgres 18, Go API, MailPit, SeaweedFS) |
| Command | `npx playwright test --retries=1 --workers=4` with `CI=true`, `E2E_BROWSERS=chromium,webkit` |
| Result | **181 passed, 0 failed, 0 flaky, 3 skipped** |
| Wall clock | 3.2 min combined |

Baseline before this work, same command on `42ae032`: **165 passed, 12 failed,
1 flaky, 6 skipped**. The passing count rose by 16 — twelve repaired failures,
three passkey tests that had never executed at all, and one flake that now
passes deterministically.

The 3 remaining skips are WebKit's passkey tests, which is correct and permanent
(see *Deliberate divergences*). Everything that can run, passes on both engines.

### Status

| ID | Area | Was | Status |
|---|---|---|---|
| [E2E-001](#e2e-001) | Flights list selectors | ✘ ×4 both browsers | **fixed** |
| [E2E-002](#e2e-002) | Cloud backups / SSRF guard | ✘ both browsers | **fixed** |
| [E2E-003](#e2e-003) | Help page selector | ✘ both browsers | **fixed** |
| [E2E-004](#e2e-004) | Passkeys / insecure origin | ⊘ 6 skipped | **fixed** — 3 now pass on chromium |
| [E2E-005](#e2e-005) | QuickLog readiness gate | ⚠ webkit flake | **mitigated** — watch |
| [E2E-006](#e2e-006) | API swallows backup errors | — | **open** — `ninerlog-api`, patch ready |
| [E2E-007](#e2e-007) | `uniqueEmail()` worker collision | ⚠ latent flake | **fixed** |
| [E2E-008](#e2e-008) | Reload racing SPA navigation | ⚠ webkit flake → ✘ | **fixed** (3 sites) |
| [E2E-009](#e2e-009) | Onboarding tour dismissal race | ⚠ webkit flake | **fixed** |

Only E2E-006 is left, and it is in the API repo. Everything else is on this
branch, verified green.

### The one thing this branch does not carry

E2E-006 is a `ninerlog-api` change, so it cannot live in a frontend branch. The
patch is written out in full below and is a two-line edit. It is a
diagnosability fix, not a correctness one — nothing is red because of it.

---

## E2E-001 — Flights list renders every ICAO code twice, and the specs matched both

**Fixed.** Both browsers · 4 tests · `src/__tests__/e2e/flights.spec.ts`

### Symptom

```
Error: strict mode violation: getByText('EDOI') resolved to 2 elements:
    1) <span title="Bienenfarm Airport" class="font-mono tracking-tight tabular-nums shrink-0">EDOI</span>
    2) <span class="font-mono tabular-nums">EDOI</span> aka getByLabel('Flight Log').getByText('EDOI')
```

### Root cause

The flights page ships both layouts in the DOM at all times and picks between
them with CSS only — [`FlightsPage.tsx:567`](../src/pages/flights/FlightsPage.tsx#L567)
is the phone card list (`lg:hidden`), [`FlightsPage.tsx:632`](../src/pages/flights/FlightsPage.tsx#L632)
the desktop table (`hidden lg:block`). `getByText` does not filter on
visibility, so an unscoped match hits both. Fallout from the flight-list rework
(`7cb1584`, `28ccaf5`, `4d13dd2`, `0e41ce1`) — the specs were not carried along.
**The app was never broken**; both layouts rendering at once is the intended
responsive approach.

### Fix applied

A `flightTable()` helper scopes assertions to `getByRole('table', { name: 'Flight Log' })`,
the table's existing `aria-label`. Two follow-on repairs came with it:

- `should delete a flight` now finds its row via `table.getByRole('row')`. Only
  the table still carries row-level actions ([`FlightsPage.tsx:781`](../src/pages/flights/FlightsPage.tsx#L781));
  `e1e12b8` moved the card's edit/delete to the detail page, so the old
  `tr, [class*="border-b"]` locator matched both layouts and could not work.
- `should search flights` seeds its own flight (EGLL/EGKK) instead of searching
  for one the preceding create-flight test happened to leave behind. That
  ordering dependency turned one real failure into two and hid which broke.

---

## E2E-002 — Cloud backup destination could not be created: the SSRF guard blocked the test S3

**Fixed.** Both browsers · 1 test · `src/__tests__/e2e/backups.spec.ts:18`

### Symptom

Card never appears; API logs `POST /api/v1/backups/destinations status:500` with
no further detail.

### Root cause — established by experiment

`CreateDestination` calls `provider.Validate` before persisting
(`ninerlog-api/internal/service/cloudbackup/destinations.go:82`), which opens an
S3 connection. That goes through the SSRF guard in
`internal/service/cloudbackup/netguard/netguard.go`, which refuses RFC-1918
destinations unless `BACKUP_ALLOW_PRIVATE_NETWORKS=true`. The e2e SeaweedFS sits
on the compose bridge at `172.18.x.x`, and `docker-compose.test.yml` never set
that variable — it set `E2E_S3_ENDPOINT`, which the API only reads in its *own*
Go e2e test, never at runtime.

Same payload, same token, same SeaweedFS, two API containers:

| API container | `BACKUP_ALLOW_PRIVATE_NETWORKS` | Result |
|---|---|---|
| `api-test` as the stack ran it | unset | `HTTP 500 {"error":"Backup operation failed"}` |
| probe container | `true` | `HTTP 201`, destination created |

Ruled out: SeaweedFS health, bucket existence, credentials (`mc ls
sw/ninerlog-backups` succeeds from the same network).

### Fix applied

`BACKUP_ALLOW_PRIVATE_NETWORKS: "true"` on the `api-test` service, with a
comment recording that this is harness-only — production must keep the guard on,
since it is what stops a user pointing a backup destination at internal
infrastructure.

---

## E2E-003 — `getByText('Help Base')` also matched a paragraph

**Fixed.** Both browsers · 1 test · `src/__tests__/e2e/profile-help.spec.ts:199`

Substring matching: the page gained body copy mentioning "Help Base", so the
unscoped text match stopped being unique. App behaviour was correct — the two
sibling tests in the same block always passed. Now asserts on
`getByRole('heading', { name: 'Help Base' })`.

---

## E2E-004 — Passkey coverage was zero on *every* browser

**Fixed.** 3 tests now pass on chromium; WebKit skips by design.

### Symptom

All three passkey tests skipped on chromium as well as webkit, and the
capability probe reported `publicKeyCredential` and `clipboardWriteText` as MISS
on both.

### Root cause

The e2e dev server served plain HTTP on `app.ninerlog.test` — not a secure
context, so `window.PublicKeyCredential` was undefined and the spec's third
guard skipped. `playwright.config.ts` launched chromium with
`--unsafely-treat-insecure-origin-as-secure` specifically to avoid this, **and
the switch did not take effect.** Measured against the running stack:

| chromium launch | `isSecureContext` | `PublicKeyCredential` |
|---|---|---|
| flag only (the old config) | `false` | `false` |
| flag + persistent `--user-data-dir` | `false` | `false` |

So the chromium-only gate had been reporting green while testing nothing.

### Fix applied — the origin is now genuinely secure

Rather than persuade the browser to pretend, the dev server now serves TLS:

- `@vitejs/plugin-basic-ssl`, enabled only when `E2E_HTTPS=1`, so `npm run dev`
  stays on plain HTTP and nothing local has to trust a throwaway certificate.
- `frontend-dev` sets `E2E_HTTPS=1`; its healthcheck moved to `https://` with
  `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- `PLAYWRIGHT_BASE_URL`, `FRONTEND_URL` and `WEBAUTHN_RP_ORIGINS` moved to
  `https://`.
- `playwright.config.ts` sets `ignoreHTTPSErrors: true` and drops the
  `--unsafely-treat-insecure-origin-as-secure` args entirely — they never worked
  and are now unnecessary.

Result: `clipboardWriteText` ok on both browsers, `publicKeyCredential` ok on
chromium.

### A second bug this uncovered

With WebAuthn finally exposed, `sign in with a registered passkey` ran for the
first time — and failed, timing out on `#email`. The page snapshot showed an
authenticated dashboard.

[`LoginPage.tsx:129`](../src/pages/auth/LoginPage.tsx#L129) starts a conditional
(autofill) ceremony on mount. A virtual authenticator with
`automaticPresenceSimulation: true` answers it with no user gesture at all, so
the test was signed in and redirected before it could type an address. A real
platform authenticator does not do that — conditional UI waits for the user to
pick a credential.

The test now drives `WebAuthn.setAutomaticPresenceSimulation`: off while the
login page mounts, back on for the explicit button press that is actually under
test.

This was worth having. It is exactly the class of thing that stays hidden when a
suite skips instead of running.

---

## E2E-005 — QuickLog cancel test flaked on WebKit

**Mitigated — keep watching.** `src/__tests__/e2e/quicklog-aircraft.spec.ts`

### Symptom

```
attempt 0: timedOut (30015ms)  — locator.selectOption: waiting for locator('#quicklog-aircraft')
attempt 1: passed (3003ms)
```

### Root cause

Three of the four tests navigated and immediately drove the `<select>`, with no
readiness gate; only the test at `:15` waited for the heading first. Without it,
the lazy route chunk, the aircraft query and the option list all had to land
inside the action's own wait. WebKit runs ~1.8× slower than chromium and the run
used `--workers=4`, which was enough to overrun.

### Fix applied

All three now wait for the `Quick Log` heading and an attached select before
acting.

**Honest status:** the flake did not recur in the verification runs, but a flake
that appeared once in one run is not proven fixed by a handful of green ones.
The change is a genuine robustness improvement regardless. Re-open if it returns.

---

## E2E-006 — The API swallows the cause of a failed backup operation

**Open. Lives in `ninerlog-api`, so it is not in this branch.**

`respondBackupError`'s `default` branch (`internal/api/handlers/backup.go:312`)
returns `{"error":"Backup operation failed"}` and logs **nothing** beyond the
access-log line. The netguard rejection behind E2E-002 left no trace anywhere:
not in the response, not in the API log, and not in `last_error` (creation fails
before the row is persisted). Diagnosing it needed two API containers and a
controlled experiment.

The sanitised *response* is right — it deliberately avoids leaking internals. The
missing *server-side* log is not.

### Patch, ready to apply

`slog` is already the handler package's logging idiom (see `admin.go:154`), and
is not yet imported by `backup.go`.

```go
	default:
		// Avoid leaking internal details to the client; the operator still
		// needs to see what actually failed, or a rejected connection looks
		// like an unexplained 500.
		msg := err.Error()
		if strings.Contains(strings.ToLower(msg), "missing required field") {
			h.sendError(c, http.StatusBadRequest, msg)
			return
		}
		slog.Error("backup operation failed", "path", c.Request.URL.Path, "error", err)
		h.sendError(c, http.StatusInternalServerError, "Backup operation failed")
```

Add `"log/slog"` to the import block. No response-shape change, so no e2e or
OpenAPI impact.

---

## E2E-007 — `uniqueEmail()` collided across parallel workers

**Fixed.** Latent; surfaced during verification as a 409 on registration.

```
Error: Registration failed: 409 {"error":"Email already exists"}
    at createTestUser (helpers.ts:116)
```

`uniqueEmail()` built its address from `Date.now()` and a module-scoped counter.
Playwright runs each worker in its own process, so **every worker starts the
counter at zero**. Two workers registering in the same millisecond produced the
same address and the second got a 409. Nothing about this is browser-specific —
it could strike any spec, on any engine, at `--workers>1`.

Now carries a `randomUUID()` suffix. The timestamp and counter stay because they
make a leftover row in the test database traceable back to a run.

---

## E2E-008 — `page.reload()` raced the SPA navigation on WebKit

**Fixed, 3 call sites.**

```
Error: page.reload: Frame load interrupted
```

A test clicks a nav link and calls `page.reload()` immediately. The client-side
navigation is still in flight, so the reload aborts it — which WebKit reports as
a hard error where Chromium tolerates it silently. Same class as E2E-005: a
missing readiness gate that only the slower engine exposes.

First seen on `currency.spec.ts:28` as a flake. Fixing that one alone was the
wrong instinct — an audit of every `page.reload()` in the suite found the same
shape in two more places, and on the next full run `credentials.spec.ts:25`
failed outright (both attempts), not flakily:

| site | route |
|---|---|
| `currency.spec.ts:28` | `/currency` |
| `credentials.spec.ts:22` | `/credentials` |
| `credentials.spec.ts:43` | `/credentials` |
| `licenses.spec.ts:21` | `/licenses` |

(`dashboard.spec.ts`'s two reloads follow API seeding rather than a click, so
they were never at risk.)

All now assert `toHaveURL(...)` before reloading. Verified with
`--repeat-each=3` on webkit: 30/30 green.

---

## E2E-009 — The onboarding tour swallowed clicks on WebKit

**Fixed.** `src/__tests__/e2e/helpers.ts`

### Symptom

```
locator.click: Test timeout of 30000ms exceeded.
  - <div aria-hidden="true" class="absolute inset-0 bg-slate-950/70"></div>
    from <div role="dialog" aria-label="Welcome tour"> subtree intercepts pointer events
```

### Root cause — two bugs stacked

`dismissOnboardingTourIfPresent` opened with an **instantaneous**
`dialog.isVisible()`. The tour mounts a moment after the dashboard paints, so on
a slower engine the check reported "no tour", the helper returned, and the
backdrop appeared afterwards to swallow the caller's next click.

`registerAndLogin` then made it worse by ordering the two defences backwards: it
dismissed the tour *before* writing the `ninerlog-onboarding` suppression to
localStorage. Since that write only affects later page loads, a tour that
mounted late slipped past both steps.

### Fix applied

The helper now waits up to 3 s for the dialog to appear before deciding it is
absent, and `registerAndLogin` writes the suppression storage first, then
dismisses whatever is already mounted. Verified with `--repeat-each=3` on
webkit: 33/33 green.

---

## Deliberate divergences — do not file these

Properties of the tooling, already understood. Detail in
`docs/CROSS_BROWSER_TESTING.md`.

- **WebAuthn is Chromium-only in e2e.** The virtual authenticator is installed
  over CDP (`newCDPSession`), which WebKit and Firefox do not speak. Since
  E2E-004 the capability probe also reports `publicKeyCredential` as genuinely
  unsupported in Playwright's Linux WebKit build — that MISS is now a true
  signal rather than an artefact of the insecure origin. Safari and Firefox
  passkey support has to be verified by hand.
- **Clipboard reads.** `clipboard-write` can only be pre-granted on Chromium.
  Assert on UI feedback, never by reading the clipboard back.
- **`backdrop-filter`** has an `@supports` fallback in `src/index.css:349`.
- **Playwright cannot drive Safari.app.** `webkit` is the same engine, so it
  catches layout/CSS/JS/`Intl` differences, but not ITP cookie eviction, the
  platform authenticator, or Smart App Banner.

## Capability matrix — 2026-08-03, over HTTPS

| capability | chromium | webkit |
|---|---|---|
| localStorage | ok | ok |
| structuredClone | ok | ok |
| intersectionObserver | ok | ok |
| resizeObserver | ok | ok |
| intlDisplayNames | ok | ok |
| intlDateTimeDe | ok | ok |
| createObjectURL | ok | ok |
| anchorDownloadAttr | ok | ok |
| localMidnightDateParse | ok | ok |
| fileConstructor | ok | ok |
| cssHas | ok | ok |
| cssContainerQueries | ok | ok |
| cssBackdropFilter | ok | ok |
| cssSafeAreaInsets | ok | ok |
| clipboardWriteText | ok | ok |
| publicKeyCredential | ok | MISS *(engine — expected)* |

`localMidnightDateParse` and `intlDateTimeDe` are green on WebKit: the date
handling that most often breaks in Safari is holding.

## What this work did not establish

- **Firefox, branded Chrome and Edge were not run.** The projects exist; only
  chromium and webkit have been exercised against the HTTPS stack. Chrome and
  Edge are Blink and unlikely to diverge; Firefox is a genuine third engine and
  is the obvious next matrix run.
- **Mobile viewports were not run.** `mobile-chrome` and `mobile-safari` would
  exercise the phone card list — the layout E2E-001's fix deliberately steps
  around by asserting against the desktop table. Nothing currently covers the
  card list's route rendering.
- **No Safari-application coverage.** Out of scope for Playwright entirely.

## Keeping this current

```bash
docker compose -f docker-compose.test.yml --profile e2e up -d --build \
  postgres-test mailpit-test seaweedfs-test api-test frontend-dev minio-test-init

docker compose -f docker-compose.test.yml --profile e2e run --rm --no-deps \
  -e E2E_BROWSERS=chromium,webkit \
  frontend-e2e npx playwright test --retries=1 --workers=4 --reporter=list,json

node scripts/browser-compat-matrix.mjs
```

After changing a dependency, add `--force-recreate --renew-anon-volumes` to the
`up` — the containers keep `node_modules` in an anonymous volume that otherwise
survives a rebuild and shadows the new package.

After a run: update *Last full run*, close entries that went green, and add new
ones with the same shape — symptom, root cause with the evidence that
established it, and the fix. An entry with no verified root cause is a lead, not
an entry; say so explicitly rather than guessing.

Per project policy, a red spec gets a GitHub issue and a fix. It never gets
skipped or worked around in the test.
