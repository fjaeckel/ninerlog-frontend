---
name: api-layer
description: How NinerLog talks to its backend — regenerating the typed client from the OpenAPI spec, writing TanStack Query hooks, cache invalidation, and the auth/token-refresh machinery. Load when adding or changing an API-backed hook, consuming a new endpoint, regenerating src/api/schema.ts, debugging 401s/token refresh/session resume, or fixing stale data after a mutation.
---

# The API layer

**Golden rule:** `component → hook in src/hooks/ → apiClient in src/api/client.ts → API`. Components never call `fetch`/`axios` directly.

## Generated types

`src/api/schema.ts` is generated from `ninerlog-api/api-spec/openapi.yaml`. Never hand-edit it.

```bash
npm run generate:api                                       # fetches the spec from GitHub main
npm run generate:api -- ../ninerlog-api/api-spec/openapi.yaml   # local spec during cross-repo work
```

An API change starts in the spec repo, then regenerates here — a broken contract becomes a TypeScript error instead of a runtime surprise.

`src/api/client.ts` carries a "DO NOT EDIT MANUALLY" header but is **not** generated; only `schema.ts` is. Edit it deliberately.

Consume types off the schema, don't redeclare them:

```ts
import type { components, operations } from '@/api/schema';

type Flight       = components['schemas']['Flight'];
type FlightCreate = components['schemas']['FlightCreate'];
type ListFlightsQ = operations['listFlights']['parameters']['query'];
```

## The hook pattern

One file per domain in `src/hooks/` (`useFlights.ts`, `useAircraft.ts`, …). Queries return data; mutations invalidate what they affect.

```ts
export const useFlights = (params?: ListFlightsParams) =>
  useQuery({
    queryKey: ['flights', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/flights', { params: { query: params || {} } });
      if (error) throw error;
      return data as PaginatedFlights;
    },
    placeholderData: keepPreviousData, // smooth pagination
  });

export const useCreateFlight = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: FlightCreate) => {
      const { data, error } = await apiClient.POST('/flights', { body });
      if (error) throw error;
      return data as Flight;
    },
    onSuccess: () => invalidateFlightDependentQueries(queryClient),
  });
};
```

Query keys are structured and stable: `['flights', params]`, `['currency', licenseId]`.

## Cache invalidation

Flights feed statistics, currency, and trends. Rather than remembering every dependent key, flight mutations call `invalidateFlightDependentQueries()` from `src/hooks/invalidation.ts`.

**When you add a query whose data derives from the flight log, add its key to `FLIGHT_DEPENDENT_QUERY_KEYS`** — otherwise it silently goes stale after a create/update/delete/import.

## Auth — you generally don't touch this

> **`../ninerlog-api/docs/SESSION_CONTRACT.md` is binding here.** It is shared with the API repo and governs everything below. Read it before changing `client.ts`, and change it in the same PR as any behaviour it describes.

`src/api/client.ts` owns the token lifecycle through `openapi-fetch` middleware:

- **on request** — awaits `bootstrapPromise`, then attaches `Authorization: Bearer <accessToken>`.
- **on response** — a `401` from a non-auth endpoint triggers a single refresh (de-duplicated across concurrent requests via a shared `refreshPromise`), retries the original request once, and redirects to `/login` **only if the session was actually cleared**. `/auth/login|register|refresh|2fa|password-reset` and `/sign/*` are excluded — an anonymous instructor signing a flight has no refresh token and must never be bounced to login.
- a proactive timer refreshes ~60s before expiry and re-arms itself after a failed attempt; `visibilitychange` / `online` / `pageshow` refresh a stale token when the installed PWA resumes.

### The rule that matters

**Only a `401` from `/auth/refresh` ends a session.** `refreshAccessToken` classifies every other outcome as transient and retries with backoff, keeping the stored tokens:

| Outcome | Meaning |
|---|---|
| `200` | Renewed — store the pair, broadcast it to the other tabs |
| `401` | The session is genuinely gone — `clearAuth()` and go to `/login` |
| `429`, `5xx`, network error, malformed body | Transient — back off and retry, **keep the tokens** |

Clearing the session on a `5xx` or a dropped connection is how a backend restart or a moment of bad signal used to log everyone out. `src/__tests__/api/refreshResilience.test.ts` holds each row of that table in place.

### Cross-tab coordination

Tabs share `localStorage` but hold their own in-memory copy, so a rotation in one tab leaves the others with a superseded token. `client.ts` broadcasts each new pair over a `BroadcastChannel` (`ninerlog-auth`); a tab adopts an incoming pair when it is newer than what it holds. The API's reuse grace covers the races this cannot prevent — it is a safety net, not a substitute.

### Sessions UI

`src/hooks/useSessions.ts` wraps `GET/DELETE /auth/sessions`; `SessionsSection` renders them under Profile → Data & Security. A user may hold several concurrent sessions (default 5) — **signing in on one device never signs out another**.

`App.tsx` blocks all rendering until the module-level `bootstrapPromise` settles, so a cold PWA launch from the iOS home screen never flashes `/login`. `authStore` persists the access token to `localStorage` — a deliberate trade-off documented inline in `src/stores/authStore.ts`.

The client reads and subscribes to `authStore` outside React via `useAuthStore.getState()` / `.subscribe()`.

## Errors and config

- Surface failures with `extractApiError` / `extractApiStatus` / `extractApiFieldErrors` from `src/lib/errors.ts`.
- Never read `import.meta.env` in app code — `src/lib/config.ts` resolves `window.ENV` (injected by `docker-entrypoint.sh`) first, so one built image runs in any environment.
