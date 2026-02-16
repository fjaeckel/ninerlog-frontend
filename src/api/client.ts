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
  onRequest({ request }) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response, request }) {
    // Handle 401 by attempting token refresh — but NOT for auth-related endpoints
    if (response.status === 401) {
      const url = request.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/2fa/') || url.includes('/auth/register') || url.includes('/auth/refresh');
      if (!isAuthEndpoint) {
        // Attempt to refresh the token
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const success = await refreshPromise;
        if (!success && typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return response;
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

// Export types for convenience
export type * from './schema';
