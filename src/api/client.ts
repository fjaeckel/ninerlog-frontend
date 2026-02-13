// Auto-generated API client using openapi-fetch
// DO NOT EDIT MANUALLY - regenerate with: npm run generate:api

import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create typed client
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// Add auth token interceptor
apiClient.use({
  onRequest({ request }) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  onResponse({ response, request }) {
    // Handle 401 by clearing auth — but NOT for auth-related endpoints
    if (response.status === 401) {
      const url = request.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/2fa/') || url.includes('/auth/register');
      if (!isAuthEndpoint) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return response;
  },
});

// Export types for convenience
export type * from './schema';
