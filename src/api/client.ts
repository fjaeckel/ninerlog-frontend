// Auto-generated API client using openapi-fetch
// DO NOT EDIT MANUALLY - regenerate with: npm run generate:api

import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../lib/config';

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// In-flight token refresh, shared by concurrent callers.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();
  if (!refreshToken) {
    clearAuth();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }

    const data = await response.json();
    updateTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

// Auth middleware: attach token, refresh-and-retry on 401.
apiClient.use({
  async onRequest({ request }) {
    // Wait for the in-flight bootstrap refresh, if any.
    if (bootstrapPromise) {
      try { await bootstrapPromise; } catch { /* ignore */ }
    }
    const token = useAuthStore.getState().accessToken;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response, request }) {
    if (response.status !== 401) return response;

    const url = request.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/2fa/') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/password-reset') ||
      url.includes('/auth/oidc/') ||
      url.includes('/auth/providers') ||
      // Public signing endpoints.
      url.includes('/sign/');
    if (isAuthEndpoint) return response;

    // Retry at most once per request.
    if ((request as Request & { __retried?: boolean }).__retried) return response;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const success = await refreshPromise;
    if (!success) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return response;
    }

    // Re-issue the original request with the new access token
    const newToken = useAuthStore.getState().accessToken;
    const retryRequest = request.clone();
    if (newToken) retryRequest.headers.set('Authorization', `Bearer ${newToken}`);
    (retryRequest as Request & { __retried?: boolean }).__retried = true;
    try {
      return await fetch(retryRequest);
    } catch {
      return response;
    }
  },
});

/** Key under which the HTTP status is attached to error response bodies. */
export const HTTP_STATUS_KEY = 'httpStatus';

/** An API error body carrying the HTTP status that produced it. */
export type ApiErrorBody = Record<string, unknown> & { httpStatus?: number };

/** Reads the HTTP status off a thrown API error, when it has one. */
export function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as ApiErrorBody)[HTTP_STATUS_KEY];
  return typeof status === 'number' ? status : undefined;
}

// Stamp the HTTP status onto error bodies.
apiClient.use({
  async onResponse({ response }) {
    if (response.ok) return response;

    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      // Non-JSON body.
      body = undefined;
    }

    // Augment plain JSON objects only.
    const augmented =
      typeof body === 'object' && body !== null && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), [HTTP_STATUS_KEY]: response.status }
        : { [HTTP_STATUS_KEY]: response.status };

    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(augmented), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
});

// ── Proactive token refresh timer ──
// Refreshes the access token 60 seconds before it expires.
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const { tokenExpiresAt, refreshToken } = useAuthStore.getState();
  if (!tokenExpiresAt || !refreshToken) return;

  const msUntilExpiry = tokenExpiresAt - Date.now();
  // Refresh 60 seconds before expiry, but at least 5 seconds from now
  const refreshIn = Math.max(msUntilExpiry - 60_000, 5_000);

  refreshTimer = setTimeout(async () => {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const success = await refreshPromise;
    if (success) {
      scheduleTokenRefresh();
    }
  }, refreshIn);
}

// Start/stop the refresh timer on auth store changes.
useAuthStore.subscribe((state, prevState) => {
  if (state.tokenExpiresAt !== prevState.tokenExpiresAt) {
    if (state.tokenExpiresAt && state.refreshToken) {
      scheduleTokenRefresh();
    } else if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }
});

// Start the timer for an already-active session.
scheduleTokenRefresh();

// ── Bootstrap refresh on app start ──
// Resolves once the session is ready; all API requests await it on first call.
export let bootstrapPromise: Promise<boolean> | null = null;

function bootstrap(): Promise<boolean> {
  const { refreshToken, accessToken, tokenExpiresAt, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !refreshToken) return Promise.resolve(false);

  // Persisted access token still valid: use it as-is.
  const skewMs = 30_000; // refresh this long before expiry
  if (accessToken && tokenExpiresAt && tokenExpiresAt - Date.now() > skewMs) {
    scheduleTokenRefresh();
    return Promise.resolve(true);
  }

  return refreshAccessToken().then((ok) => {
    if (ok) scheduleTokenRefresh();
    return ok;
  });
}

bootstrapPromise = bootstrap().finally(() => {
  // No-op; keeps bootstrapPromise awaitable.
});

// ── Resume on visibility / online ──
// Refreshes a stale token when the app returns to the foreground.
if (typeof window !== 'undefined') {
  const refreshIfStale = () => {
    const { isAuthenticated, refreshToken, tokenExpiresAt } = useAuthStore.getState();
    if (!isAuthenticated || !refreshToken) return;
    const stale = !tokenExpiresAt || tokenExpiresAt - Date.now() < 60_000;
    if (!stale) return;
    if (refreshPromise) return; // already refreshing
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    refreshPromise.then((ok) => { if (ok) scheduleTokenRefresh(); });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshIfStale();
  });
  window.addEventListener('online', refreshIfStale);
  window.addEventListener('pageshow', refreshIfStale); // bfcache / iOS swipe-back
}

export type * from './schema';
