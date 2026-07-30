# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

React 19 + TypeScript + Vite PWA for NinerLog (EASA/FAA pilot logbook). A pure client — no business logic the API doesn't also enforce. Sibling repos: `../ninerlog-api` (Go backend, owns the OpenAPI spec), `../ninerlog` (deployment).

## Commands

```bash
npm run dev                 # :5173, proxies /api → localhost:3000 (VITE_API_PROXY_TARGET overrides)
npm run build               # tsc && vite build
npm run type-check          # tsc --noEmit
npm run lint                # ESLint (lint:fix to autofix)
npm run generate:api        # regenerate src/api/schema.ts from the OpenAPI spec

npx vitest run              # unit tests, single run (what CI runs); npm test = watch
npx vitest run LoginPage    # single file / name filter
npm run test:e2e            # Playwright — needs a live API + MailPit, see the testing skill
```

Push gate: `npx vitest run && npm run type-check && npm run lint`, plus e2e when behavior changed.

## Invariants

- `src/api/schema.ts` is **generated** — never edit. API changes start in the spec repo, then regenerate here. (`src/api/client.ts` claims to be generated but is hand-maintained.)
- Data access goes `component → hook in src/hooks/ → apiClient`. No `fetch`/`axios` in components, no fetching in `src/components/ui/`.
- Mutations invalidate on success. Anything derived from flights uses `invalidateFlightDependentQueries()` — add new derived keys to `FLIGHT_DEPENDENT_QUERY_KEYS` (`src/hooks/invalidation.ts`).
- Server state → TanStack Query. Client-only state → Zustand (`auth`, `theme`, `onboarding`, `license`). Nothing with a server counterpart goes in a store.
- No user-facing string is hard-coded. Every key exists in **both** `en` and `de` — CI fails otherwise.
- Neutrals are `slate-*`, never `gray-*`; every light class needs a `dark:` counterpart. There is no `tailwind.config.js` — Tailwind v4 is configured in `src/index.css`.
- Strict TS, no `any`. Path alias `@` → `src/`.
- Conventional Commits; branch from `main` with `feature/`, `fix/`, or `docs/`.

## Where to look

| Task | Load |
|---|---|
| API client, hooks, caching, auth/token flow | skill `api-layer` |
| Styling, components, tokens, dark mode | skill `design-system` |
| Translatable strings, namespaces | skill `i18n` |
| New route/page | skill `add-page` |
| Writing or running tests | skill `testing` |
| Deep architecture reference | `docs/DEVELOPER_GUIDE.md` |

Root `IMPLEMENTATION.md` and root `TESTING.md` are stale (React 18, axios, Tailwind 3) — ignore them; `docs/TESTING.md` is current except that it wrongly describes E2E as MSW-mocked.
