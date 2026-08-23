import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import {
  useCustomCurrencies,
  useCreateCustomCurrency,
  useDeleteCustomCurrency,
  useSetShareCustomCurrency,
  useSharedRule,
} from '../../hooks/useCustomCurrency';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../lib/config';
import type { User } from '../../types/api';

/**
 * These hooks used to reach the API through their own `fetch` wrapper, which
 * made custom currency the one feature that never got the shared client's 401
 * refresh-and-retry: an expired access token surfaced as a failed rule list
 * rather than a silent refresh. They now go through `apiClient`, and these
 * tests hold that in place — every request has to carry the bearer token the
 * auth store holds and hit the path the OpenAPI spec declares.
 */

const USER = { id: 'u1', email: 'pilot@example.com', name: 'Test Pilot' } as User;

const RULE = {
  id: 'r1',
  userId: 'u1',
  name: 'Night landings',
  definition: {
    window: { amount: 90, unit: 'days' as const },
    requirements: [{ metric: 'night_landings' as const, min: 3 }],
  },
  enabled: true,
  notify: false,
  isShared: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const EVALUATION = {
  status: 'current' as const,
  windowLabel: 'last 90 days',
  requirements: [],
  evaluatedAt: '2026-01-01T00:00:00Z',
};

/**
 * Absolute URL for a handler. API_BASE_URL may be absolute or origin-relative
 * depending on the environment, so resolve it the same way the browser does.
 */
const url = (path: string) =>
  new URL(`${API_BASE_URL}${path}`, globalThis.location?.origin ?? 'http://localhost').toString();

/** The request msw saw, so assertions can inspect method, path and headers. */
let seen: Request | undefined;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

beforeEach(() => {
  seen = undefined;
  useAuthStore.getState().setAuth(USER, 'access-1', 'refresh-1', 900);
});

afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearAuth();
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Records the request and answers with `body`. */
function record(body: Parameters<typeof HttpResponse.json>[0], status = 200) {
  return ({ request }: { request: Request }) => {
    seen = request.clone();
    if (status === 204) return new HttpResponse(null, { status });
    return HttpResponse.json(body, { status });
  };
}

describe('useCustomCurrency', () => {
  it('lists rules through the shared client, carrying the bearer token', async () => {
    server.use(http.get(url('/custom-currency'), record([{ rule: RULE, evaluation: EVALUATION }])));

    const { result } = renderHook(() => useCustomCurrencies(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The point of the change: it goes through apiClient's auth middleware.
    expect(seen?.headers.get('Authorization')).toBe('Bearer access-1');
    expect(result.current.data?.[0].rule.name).toBe('Night landings');
  });

  it('interpolates the rule id into the declared path', async () => {
    server.use(http.delete(url('/custom-currency/r1'), record(null, 204)));

    const { result } = renderHook(() => useDeleteCustomCurrency(), { wrapper });
    result.current.mutate('r1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(seen?.method).toBe('DELETE');
    expect(new URL(seen!.url).pathname).toMatch(/\/custom-currency\/r1$/);
  });

  it('encodes a share token that is not URL-safe', async () => {
    server.use(
      http.get(
        url('/custom-currency/shared/:shareToken'),
        record({ name: 'Shared', definition: RULE.definition, shareToken: 'a/b+c' })
      )
    );

    const { result } = renderHook(() => useSharedRule('a/b+c'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The token is one path segment, so a slash inside it must not open another.
    expect(new URL(seen!.url).pathname).toMatch(/\/custom-currency\/shared\/[^/]+$/);
  });

  it('sends the create body as JSON', async () => {
    server.use(http.post(url('/custom-currency'), record({ rule: RULE, evaluation: EVALUATION }, 201)));

    const { result } = renderHook(() => useCreateCustomCurrency(), { wrapper });
    result.current.mutate({ name: 'Night landings', definition: RULE.definition });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await expect(seen!.json()).resolves.toMatchObject({ name: 'Night landings' });
  });

  it('uses POST to share and DELETE to unshare the same path', async () => {
    server.use(
      http.post(url('/custom-currency/r1/share'), record({ ...RULE, isShared: true })),
      http.delete(url('/custom-currency/r1/share'), record({ ...RULE, isShared: false }))
    );

    const { result } = renderHook(() => useSetShareCustomCurrency(), { wrapper });

    result.current.mutate({ id: 'r1', shared: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen?.method).toBe('POST');

    result.current.mutate({ id: 'r1', shared: false });
    await waitFor(() => expect(seen?.method).toBe('DELETE'));
  });

  /**
   * The regression this change exists to prevent: the old hand-rolled fetch
   * had no 401 handling, so a rule list that outlived its access token failed
   * outright instead of refreshing. Going through apiClient means the shared
   * middleware refreshes and replays the request.
   */
  it('refreshes and replays when the access token has expired', async () => {
    const authorizations: (string | null)[] = [];
    let listCalls = 0;

    server.use(
      http.post(url('/auth/refresh'), () =>
        HttpResponse.json({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 })
      ),
      http.get(url('/custom-currency'), ({ request }) => {
        authorizations.push(request.headers.get('Authorization'));
        listCalls += 1;
        if (listCalls === 1) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return HttpResponse.json([{ rule: RULE, evaluation: EVALUATION }]);
      })
    );

    const { result } = renderHook(() => useCustomCurrencies(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listCalls).toBe(2);
    expect(authorizations).toEqual(['Bearer access-1', 'Bearer access-2']);
    expect(result.current.data?.[0].rule.name).toBe('Night landings');
    // The session survives; only a 401 from /auth/refresh ends it.
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('surfaces the API error message so the builder can show it', async () => {
    server.use(
      http.post(url('/custom-currency'), record({ error: 'unknown metric "barrel_rolls"' }, 400))
    );

    const { result } = renderHook(() => useCreateCustomCurrency(), { wrapper });
    result.current.mutate({ name: 'Bad', definition: RULE.definition });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('unknown metric "barrel_rolls"');
  });
});
