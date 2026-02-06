import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';

// Extract request body types from operations (they're inline, not in components)
type RegisterRequest = operations['registerUser']['requestBody']['content']['application/json'];
type LoginRequest = operations['loginUser']['requestBody']['content']['application/json'];

type AuthResponse = components['schemas']['AuthResponse'];

// Note: reset-password endpoint is not in OpenAPI spec
// This is kept for UI but commented out until backend implements it
interface ResetPasswordData {
  email: string;
}

export const useRegister = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (requestData: RegisterRequest): Promise<NonNullable<AuthResponse>> => {
      const { data, error } = await apiClient.POST('/auth/register', {
        body: requestData as any, // Type assertion needed due to openapi-fetch type inference
      });
      if (error) throw error;
      return data as NonNullable<AuthResponse>;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
    },
  });
};

export const useLogin = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (requestData: LoginRequest): Promise<NonNullable<AuthResponse>> => {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: requestData as any,
      });
      if (error) throw error;
      return data as NonNullable<AuthResponse>;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
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

// ⚠️ WARNING: This endpoint is NOT in the OpenAPI spec
// Keeping for UI compatibility but may fail until backend implements it
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (resetData: ResetPasswordData) => {
      // This will fail since the endpoint doesn't exist in the spec
      // Using legacy axios client for now
      const axios = (await import('../lib/api')).default;
      const response = await axios.post('/auth/reset-password', resetData);
      return response.data;
    },
  });
};
