// Auto-generated API client using openapi-fetch
// DO NOT EDIT MANUALLY - regenerate with: npm run generate:api

import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../lib/config';

// Create typed client
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// Track whether a refresh is already in progress to avoid concurrent refreshes
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

// Add auth token interceptor
apiClient.use({
  async onRequest({ request }) {
    // Wait for the in-flight bootstrap refresh (if any) so the very first wave
    // of requests after a cold launch carries a valid Authorization header.
    if (bootstrapPromise) {
      try { await bootstrapPromise; } catch { /* ignore — onResponse will handle 401 */ }
    }
    const token = useAuthStore.getState().accessToken;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response, request }) {
    // Handle 401 by refreshing the token AND retrying the original request once
    if (response.status !== 401) return response;

    const url = request.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/2fa/') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/password-reset');
    if (isAuthEndpoint) return response;

    // Avoid infinite loops: only retry once per request
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
      scheduleTokenRefresh(); // Schedule next refresh
    }
  }, refreshIn);
}

// Subscribe to auth store changes to start/stop the refresh timer
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

// Start timer if there's already an active session (e.g. after page reload — tokens
// won't be in store after reload since they're memory-only, but this handles the
// case where the store is populated before the subscription fires)
scheduleTokenRefresh();

// ── Bootstrap refresh on app start ──
// Resolves once the session is "ready" (either we have a fresh access token or
// we've decided we don't). All API requests await this on first call, so the
// initial wave never goes out unauthenticated when the PWA cold-launches from
// the iOS / Android home screen.
export let bootstrapPromise: Promise<boolean> | null = null;

function bootstrap(): Promise<boolean> {
  const { refreshToken, accessToken, tokenExpiresAt, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !refreshToken) return Promise.resolve(false);

  // If the persisted access token is still valid, use it as-is.
  // The proactive timer will refresh it before expiry.
  const skewMs = 30_000; // refresh slightly early to avoid clock-skew 401s
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
  // Keep awaitable but allow GC of result; subsequent awaits resolve immediately.
});

// ── Resume on visibility / online ──
// When the user re-opens the installed PWA from the home screen, refresh the
// token if it's stale so the first interaction never sees a 401.
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

// Export types for convenience
export type * from './schema';
