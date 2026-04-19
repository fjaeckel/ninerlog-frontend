# Running Tests

This guide covers how to run the NinerLog frontend test suites.

## Prerequisites

**Local development:**
- Node.js 24+ and npm 11+

**Docker only (no local Node.js needed):**
- Docker & Docker Compose

```bash
# Local setup
npm install
npx playwright install   # First time only, for E2E tests
```

---

## Running Tests via Docker

You can run all tests in Docker containers without installing Node.js or browsers locally.

### Unit Tests in Docker

```bash
docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit
```

This builds a container from `Dockerfile.dev`, mounts your source code, and runs Vitest.

### E2E Tests in Docker

Runs the full stack (Postgres + API + frontend dev server + Playwright) entirely in containers:

```bash
docker compose -f docker-compose.test.yml --profile e2e up --build --abort-on-container-exit
```

The E2E container uses the official Playwright Docker image with browsers pre-installed — no need to run `npx playwright install` locally.

### All Tests in Docker

```bash
# Unit tests + E2E tests
bash scripts/run-all-tests.sh --with-e2e

# Unit tests only
bash scripts/run-all-tests.sh
```

The script handles starting/stopping all containers and reports pass/fail at the end.

### Workspace-Level (Both Repos)

From the workspace root:

```bash
bash run-all-tests.sh           # API + frontend unit tests
bash run-all-tests.sh --with-e2e # API + frontend unit + E2E tests
```

---

## Running Tests Locally

### Unit Tests (Vitest + React Testing Library)

Unit tests validate individual components, hooks, and utilities in isolation.

```bash
# Run all unit tests (watch mode)
npm test

# Run all unit tests once
npx vitest run

# Run with coverage report
npx vitest run --coverage

# Run a specific test file
npx vitest run LoginPage

# Run tests matching a pattern
npx vitest run --grep "renders form"

# Interactive UI mode
npm run test:ui
```

### Watch Mode

The default `npm test` command runs in watch mode — tests re-run automatically when source files change. Press `q` to quit.

## E2E Tests (Playwright)

End-to-end tests simulate real user interactions in a browser.

### With Mock API (default)

E2E tests use MSW (Mock Service Worker) to intercept API calls, so no backend is needed:

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run in headed mode (see the browser)
npm run test:e2e -- --headed

# Run a specific test file
npx playwright test auth.spec.ts

# Run tests matching a grep pattern
npx playwright test --grep "login"

# Debug mode (step through tests)
npm run test:e2e -- --debug

# Interactive UI mode
npm run test:e2e:ui
```

### With Real Backend

To run E2E tests against the actual API:

```bash
# Terminal 1: Start the backend
cd ../ninerlog-api && make run

# Terminal 2: Start the frontend dev server
cd ../ninerlog-frontend && npm run dev

# Terminal 3: Run E2E tests
npm run test:e2e
```

### Viewing Test Reports

After a test run, Playwright generates an HTML report:

```bash
npx playwright show-report
```

Failed test screenshots and traces are saved to `test-results/`.

## Type Checking & Linting

These aren't tests per se, but are part of the quality gate:

```bash
# TypeScript type check (no emit)
npm run type-check

# ESLint
npm run lint

# ESLint with auto-fix
npm run lint:fix
```

## Running Everything Locally

To validate the full frontend before committing:

```bash
npx vitest run && npm run type-check && npm run lint && npm run test:e2e
```

## Quick Reference

| Command | What it does |
|---|---|
| `npm test` | Unit tests in watch mode |
| `npx vitest run` | Unit tests (single run) |
| `npx vitest run --coverage` | Unit tests with coverage |
| `npm run test:ui` | Unit tests with Vitest UI |
| `npm run test:e2e` | E2E tests (headless) |
| `npm run test:e2e -- --headed` | E2E tests (visible browser) |
| `npm run test:e2e:ui` | E2E tests with Playwright UI |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint |
| `docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit` | Unit tests in Docker |
| `docker compose -f docker-compose.test.yml --profile e2e up --build --abort-on-container-exit` | E2E tests in Docker |
| `bash scripts/run-all-tests.sh --with-e2e` | All tests in Docker |

## Troubleshooting

**Playwright browsers not installed:**
```bash
npx playwright install
```

**Tests fail with import errors:**
```bash
npm install
npm run generate:api
```

**E2E tests time out:**
- Ensure the dev server is running if testing against real backend
- Increase timeout in `playwright.config.ts` if needed
- Check `test-results/` for screenshots of failures

**Vitest UI not loading:**
```bash
npm install @vitest/ui
```
