import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import i18n from '../i18n';
import type { components, operations } from '../api/schema';

// Extract request body types from operations (they're inline, not in components)
type RegisterRequest = operations['registerUser']['requestBody']['content']['application/json'] & {
  /** Preferred interface language, inferred from the browser at signup. */
  preferredLocale?: components['schemas']['User']['preferredLocale'];
};
type LoginRequest = operations['loginUser']['requestBody']['content']['application/json'];

type AuthResponse = components['schemas']['AuthResponse'];
type RegistrationResponse = components['schemas']['RegistrationResponse'];

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
      // Skip setAuth if 2FA is required — handled by LoginPage
      if (data.requiresTwoFactor) return;
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
      // Optional: Call logout endpoint if you have one
      // await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
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
