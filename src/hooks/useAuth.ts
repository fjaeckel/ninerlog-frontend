import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import i18n from '../i18n';
import type { components, operations } from '../api/schema';

// Request body types extracted from operations.
type RegisterRequest = operations['registerUser']['requestBody']['content']['application/json'] & {
  /** Preferred interface language, inferred from the browser at signup. */
  preferredLocale?: components['schemas']['User']['preferredLocale'];
};
type LoginRequest = operations['loginUser']['requestBody']['content']['application/json'];

type AuthResponse = components['schemas']['AuthResponse'];
type RegistrationResponse = components['schemas']['RegistrationResponse'];
export type AuthProviders = components['schemas']['AuthProviders'];

/**
 * Unauthenticated capability probe: which sign-in methods this server offers.
 * Cached for the session.
 */
export const useAuthProviders = () =>
  useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: async (): Promise<AuthProviders> => {
      const { data, error } = await apiClient.GET('/auth/providers');
      if (error) throw error;
      return data as AuthProviders;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const useRegister = () => {
  return useMutation({
    mutationFn: async (requestData: RegisterRequest): Promise<NonNullable<RegistrationResponse>> => {
      const { data, error } = await apiClient.POST('/auth/register', {
        body: requestData as any,
      });
      if (error) throw error;
      return data as NonNullable<RegistrationResponse>;
    },
  });
};

export const useVerifyEmail = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (token: string): Promise<NonNullable<AuthResponse>> => {
      const { data, error } = await apiClient.POST('/auth/verify-email', {
        body: { token } as any,
      });
      if (error) throw error;
      return data as NonNullable<AuthResponse>;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
      if (data.user?.preferredLocale && data.user.preferredLocale !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLocale);
      }
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await apiClient.POST('/auth/verify-email/resend', {
        body: { email } as any,
      });
      if (error) throw error;
    },
  });
};

export const useLogin = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (requestData: LoginRequest): Promise<any> => {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: requestData as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // No setAuth while 2FA is pending.
      if (data.requiresTwoFactor) return;
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
      if (data.user?.preferredLocale && data.user.preferredLocale !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLocale);
      }
    },
  });
};

export const useExchangeOidcCode = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (code: string): Promise<NonNullable<AuthResponse>> => {
      const { data, error } = await apiClient.POST('/auth/oidc/exchange', {
        body: { code },
      });
      if (error) throw error;
      return data as NonNullable<AuthResponse>;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
      if (data.user?.preferredLocale && data.user.preferredLocale !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLocale);
      }
    },
  });
};

export const useLogout = () => {
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Revoke the refresh token server-side.
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) return;
      try {
        await apiClient.POST('/auth/logout', { body: { refreshToken } });
      } catch {
        // Best effort.
      }
    },
    // Clears local state even when the request throws.
    onSettled: () => {
      clearAuth();
    },
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const { error } = await apiClient.POST('/auth/password-reset-request', {
        body: data,
      });
      if (error) throw error;
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const { error } = await apiClient.POST('/auth/password-reset', {
        body: data,
      });
      if (error) throw error;
    },
  });
};
